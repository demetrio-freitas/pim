# PIM - Product Information Management

Sistema moderno de Gestão de Informações de Produtos construído com stack de última geração.

## Stack Tecnológica

### Backend
- **Kotlin** + **Spring Boot 3.2**
- **PostgreSQL 16** - Banco de dados principal
- **Redis 7** - Cache e sessões
- **Elasticsearch 8** - Busca de produtos
- **MinIO** - Armazenamento de arquivos (S3-compatible)
- **Flyway** - Migrações de banco de dados
- **JWT** - Autenticação

### Frontend
- **Next.js 14** (App Router)
- **React 18** + **TypeScript**
- **TailwindCSS** - Estilização
- **TanStack Query** - Gerenciamento de estado do servidor
- **Zustand** - Estado global
- **React Hook Form** + **Zod** - Formulários e validação

## Requisitos

- Docker e Docker Compose
- Node.js 20+ (para desenvolvimento local do frontend)
- JDK 21+ (para desenvolvimento local do backend)

## Início Rápido

### Com Docker (Recomendado)

```bash
# Clone o repositório
cd /Users/demetriofreitas/Documents/PIM

# Inicie todos os serviços
docker-compose up -d

# Acesse:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8080
# - Swagger UI: http://localhost:8080/swagger-ui.html
# - MinIO Console: http://localhost:9001
```

### Desenvolvimento Local

#### Backend

```bash
cd backend

# Execute com Gradle
./gradlew bootRun

# Ou com Docker apenas para dependências
docker-compose up -d postgres redis elasticsearch minio
./gradlew bootRun
```

#### Frontend

```bash
cd frontend

# Instale dependências
npm install

# Execute em modo de desenvolvimento
npm run dev
```

## Credenciais Padrão

### Aplicação
- **Email:** admin@pim.com
- **Senha:** admin123

### MinIO
- **User:** minioadmin
- **Password:** minioadmin123

### PostgreSQL
- **Database:** pim
- **User:** pim
- **Password:** pim123

## Funcionalidades

### Produtos
- CRUD completo de produtos
- Tipos: Simples, Configurável, Virtual, Bundle, Agrupado
- Status workflow: Rascunho → Revisão → Aprovado → Publicado → Arquivado
- Score de completude automático
- Atributos dinâmicos (EAV)
- Múltiplas imagens e mídias
- SEO metadata

### Categorias
- Estrutura hierárquica ilimitada
- Drag & drop para reordenação
- URLs amigáveis automáticas

### Atributos
- 14 tipos de atributos
- Agrupamento por grupos
- Suporte a localização e canais
- Validações personalizadas
- Opções para select/multiselect

### Usuários e Permissões
- Autenticação JWT
- Roles: Admin, Manager, Editor, Viewer
- Permissões granulares por módulo

### Import/Export
- CSV e Excel
- Mapeamento de campos
- Validação prévia

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Dados do usuário

### Produtos
- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Obter produto
- `POST /api/products` - Criar produto
- `PUT /api/products/:id` - Atualizar produto
- `DELETE /api/products/:id` - Excluir produto
- `PATCH /api/products/:id/status` - Alterar status

### Categorias
- `GET /api/categories` - Listar categorias
- `GET /api/categories/tree` - Árvore de categorias
- `POST /api/categories` - Criar categoria raiz
- `POST /api/categories/:id/children` - Criar subcategoria

### Atributos
- `GET /api/attributes` - Listar atributos
- `GET /api/attribute-groups` - Listar grupos

## Estrutura do Projeto

```
PIM/
├── backend/
│   ├── src/main/kotlin/com/pim/
│   │   ├── config/          # Configurações (Security, JWT)
│   │   ├── domain/          # Entidades e regras de negócio
│   │   │   ├── product/
│   │   │   ├── category/
│   │   │   ├── attribute/
│   │   │   ├── media/
│   │   │   └── user/
│   │   ├── application/     # Serviços
│   │   └── infrastructure/  # Repositórios, Controllers
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/    # Flyway migrations
│
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # Componentes React
│   │   ├── lib/           # Utilities e API client
│   │   ├── hooks/         # Custom hooks
│   │   ├── types/         # TypeScript types
│   │   └── styles/        # CSS global
│   └── public/
│
└── docker-compose.yml
```

## Licença

MIT
