import os
import sys
import json
import shutil
import zipfile
import tempfile
import importlib.util
from pathlib import Path
from typing import Optional, Dict, Any, Callable, List
from fastapi import FastAPI, APIRouter
from starlette.routing import Route, Mount

EXTENSIONS_DIR = Path(os.environ.get("EXTENSIONS_DIR", "extensions"))


class ExtensionManager:
    def __init__(self, app: FastAPI):
        self.app = app
        self.loaded_extensions: Dict[str, Dict[str, Any]] = {}
        self.extension_routers: Dict[str, APIRouter] = {}
        self.cleanup_handlers: Dict[str, Callable] = {}
        
        EXTENSIONS_DIR.mkdir(parents=True, exist_ok=True)
    
    def get_extension_path(self, name: str, version: str) -> Path:
        return EXTENSIONS_DIR / f"{name}@{version}"
    
    def validate_manifest(self, manifest: dict) -> tuple[bool, str]:
        required_fields = ["name", "version"]
        for field in required_fields:
            if field not in manifest:
                return False, f"Missing required field: {field}"
        
        if not manifest.get("backend_entry") and not manifest.get("frontend_entry"):
            return False, "Extension must have at least backend_entry or frontend_entry"
        
        return True, ""
    
    def install_from_zip(self, zip_file_path: str) -> tuple[bool, str, Optional[dict]]:
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                
                manifest_path = Path(temp_dir) / "manifest.json"
                if not manifest_path.exists():
                    root_dirs = [d for d in Path(temp_dir).iterdir() if d.is_dir()]
                    if len(root_dirs) == 1:
                        manifest_path = root_dirs[0] / "manifest.json"
                        temp_dir = str(root_dirs[0])
                
                if not manifest_path.exists():
                    return False, "manifest.json not found in extension package", None
                
                with open(manifest_path, 'r') as f:
                    manifest = json.load(f)
                
                valid, error = self.validate_manifest(manifest)
                if not valid:
                    return False, error, None
                
                name = manifest["name"]
                version = manifest["version"]
                install_path = self.get_extension_path(name, version)
                
                if install_path.exists():
                    shutil.rmtree(install_path)
                
                shutil.copytree(temp_dir, install_path)
                
                return True, f"Extension {name}@{version} installed successfully", manifest
                
            except zipfile.BadZipFile:
                return False, "Invalid zip file", None
            except json.JSONDecodeError:
                return False, "Invalid manifest.json format", None
            except Exception as e:
                return False, f"Installation failed: {str(e)}", None
    
    def install_from_directory(self, source_dir: str) -> tuple[bool, str, Optional[dict]]:
        try:
            manifest_path = Path(source_dir) / "manifest.json"
            if not manifest_path.exists():
                return False, "manifest.json not found", None
            
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            valid, error = self.validate_manifest(manifest)
            if not valid:
                return False, error, None
            
            name = manifest["name"]
            version = manifest["version"]
            install_path = self.get_extension_path(name, version)
            
            if install_path.exists():
                shutil.rmtree(install_path)
            
            shutil.copytree(source_dir, install_path)
            
            return True, f"Extension {name}@{version} installed successfully", manifest
            
        except Exception as e:
            return False, f"Installation failed: {str(e)}", None
    
    def load_backend(self, extension_id: str, name: str, version: str, backend_entry: str) -> tuple[bool, str]:
        install_path = self.get_extension_path(name, version)
        backend_dir = install_path / "backend"
        
        if not backend_dir.exists():
            return False, "Backend directory not found"
        
        try:
            module_name, func_name = backend_entry.split(":")
            module_path = backend_dir / f"{module_name}.py"
            
            if not module_path.exists():
                return False, f"Backend module {module_name}.py not found"
            
            spec = importlib.util.spec_from_file_location(
                f"extensions.{name}.{module_name}",
                module_path
            )
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            register_func = getattr(module, func_name, None)
            if not register_func:
                return False, f"Function {func_name} not found in {module_name}"
            
            router = APIRouter(prefix=f"/api/extensions/{name}")
            cleanup = register_func(router)
            
            self.app.include_router(router)
            self.extension_routers[extension_id] = router
            
            if cleanup and callable(cleanup):
                self.cleanup_handlers[extension_id] = cleanup
            
            self.loaded_extensions[extension_id] = {
                "name": name,
                "version": version,
                "router": router,
                "module": module
            }
            
            return True, "Backend loaded successfully"
            
        except Exception as e:
            return False, f"Failed to load backend: {str(e)}"
    
    def _remove_routes_by_prefix(self, routes_list: list, prefix: str) -> None:
        """Remove routes matching the given prefix from a routes list."""
        routes_to_remove = []
        for route in routes_list:
            if isinstance(route, Mount):
                if route.path == prefix or route.path.startswith(prefix):
                    routes_to_remove.append(route)
            elif isinstance(route, Route):
                if hasattr(route, 'path') and route.path.startswith(prefix):
                    routes_to_remove.append(route)
        
        for route in routes_to_remove:
            routes_list.remove(route)
    
    def unload_backend(self, extension_id: str) -> tuple[bool, str]:
        if extension_id not in self.loaded_extensions:
            return True, "Extension not loaded"
        
        try:
            ext_info = self.loaded_extensions[extension_id]
            ext_name = ext_info.get("name", "")
            
            if extension_id in self.cleanup_handlers:
                try:
                    self.cleanup_handlers[extension_id]()
                except Exception:
                    pass
                del self.cleanup_handlers[extension_id]
            
            if extension_id in self.extension_routers:
                prefix = f"/api/extensions/{ext_name}"
                
                self._remove_routes_by_prefix(self.app.routes, prefix)
                
                if hasattr(self.app, 'router') and hasattr(self.app.router, 'routes'):
                    self._remove_routes_by_prefix(self.app.router.routes, prefix)
                
                del self.extension_routers[extension_id]
            
            module = ext_info.get("module")
            if module:
                module_name = getattr(module, '__name__', None)
                if module_name and module_name in sys.modules:
                    del sys.modules[module_name]
            
            del self.loaded_extensions[extension_id]
            
            return True, "Backend unloaded successfully"
            
        except Exception as e:
            return False, f"Failed to unload backend: {str(e)}"
    
    def uninstall(self, name: str, version: str) -> tuple[bool, str]:
        install_path = self.get_extension_path(name, version)
        
        try:
            if install_path.exists():
                shutil.rmtree(install_path)
            return True, f"Extension {name}@{version} uninstalled"
        except Exception as e:
            return False, f"Failed to uninstall: {str(e)}"
    


    def get_frontend_manifest(self, extensions: List[Any]) -> Dict[str, Any]:
        """Generate frontend manifest for enabled extensions."""
        manifests = {}
        for ext in extensions:
            if not ext.has_frontend:
                continue
            
            # Use manifest dict if available, otherwise fallback
            manifest_data = ext.manifest if isinstance(ext.manifest, dict) else {}
            
            manifests[ext.name] = {
                "id": ext.id,
                "name": ext.name,
                "version": ext.version,
                "description": ext.description,
                "frontend_entry": manifest_data.get("frontend_entry"),
                "contributes": manifest_data.get("contributes"),
                "base_url": f"/api/extensions/{ext.name}/frontend", 
                "api_base_url": f"/api/extensions/{ext.name}"
            }
        return manifests
