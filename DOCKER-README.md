# 🐳 Guía de Docker para AppViajes Frontend


## Prerrequisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 
- [Docker Compose](https://docs.docker.com/compose/) 

## Comandos Rápidos

### Desarrollo 
```bash
# Iniciar con docker-compose
docker-compose up --build

# O con npm
npm run docker:dev
```

### Gestión de contenedores
```bash
# Detener contenedores
npm run docker:stop

# Limpiar todo (contenedores, volúmenes, imágenes no utilizadas)
npm run docker:clean
```

### El contenedor no se actualiza
```bash
# Reconstruir desde cero
docker-compose up --build --force-recreate
```

### Para actualizar dependencias:
```bash
# Detener contenedores
docker-compose down

# Reconstruir con nuevas dependencias
docker-compose up --build
```


## Estructura de Docker

### Archivos Docker incluidos:

- **`Dockerfile.dev`**: Configuración para desarrollo con hot reload
- **`docker-compose.yml`**: Servicio del frontend para desarrollo
- **`.dockerignore`**: Archivos excluidos del contexto Docker

### Servicio disponible:

- **Frontend (Angular)**: Puerto 4200 con hot reload

## Acceso a la aplicación

- **Frontend**: http://localhost:4200

## Configuración de API

La URL de la API está configurada en:
- `src/environments/environment.ts` 
