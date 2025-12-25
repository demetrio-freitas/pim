# Plano de Deployment na Nuvem - PIM System

## Visão Geral do Sistema

| Componente | Tecnologia | Porta |
|------------|-----------|-------|
| Backend | Spring Boot 3.4 (Kotlin/Java 21) | 8080 |
| Frontend | Next.js 14 (React 18) | 3000 |
| Banco de Dados | PostgreSQL 16 | 5432 |
| Cache | Redis 7 | 6379 |
| Busca | Elasticsearch 8 | 9200 |
| Armazenamento | MinIO (S3-compatible) | 9000 |
| Mensageria | Kafka | 9092 |

---

## Opções de Cloud Provider

### Opção 1: AWS (Recomendado para Produção Enterprise)
**Custo estimado**: $150-500/mês

### Opção 2: DigitalOcean/Render (Recomendado para Startups)
**Custo estimado**: $50-150/mês

### Opção 3: Railway/Fly.io (Recomendado para MVP/Teste)
**Custo estimado**: $30-80/mês

---

## PLANO DE AÇÃO PASSO A PASSO

### FASE 1: PREPARAÇÃO (1-2 dias)

#### Passo 1.1: Configurar Variáveis de Ambiente para Produção

Criar arquivo `.env.production` na raiz do projeto:

```bash
# Database
DATABASE_URL=postgresql://usuario:senha@host:5432/pim
DATABASE_USER=pim_prod
DATABASE_PASSWORD=<senha_forte>

# Redis
REDIS_URL=redis://host:6379

# Elasticsearch
ELASTICSEARCH_URL=https://host:9200

# Storage (S3 ou equivalente)
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=pim-assets-prod
S3_ACCESS_KEY=<access_key>
S3_SECRET_KEY=<secret_key>

# JWT (gerar nova chave para produção!)
JWT_SECRET=<chave_256_bits_base64>

# Kafka (se necessário)
KAFKA_BOOTSTRAP_SERVERS=host:9092

# Frontend
NEXT_PUBLIC_API_URL=https://api.seudominio.com
```

#### Passo 1.2: Atualizar Configurações de CORS

Editar `backend/src/main/resources/application.yml`:
- Adicionar domínio de produção aos allowed origins

#### Passo 1.3: Configurar Secrets Management

- [ ] Remover senhas hardcoded
- [ ] Usar variáveis de ambiente para todas as credenciais
- [ ] Configurar secret manager do cloud provider

---

### FASE 2: INFRAESTRUTURA DE BANCO DE DADOS (1 dia)

#### Passo 2.1: Provisionar PostgreSQL

**AWS**: RDS PostgreSQL
```bash
# Via AWS CLI
aws rds create-db-instance \
  --db-instance-identifier pim-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16 \
  --master-username pim_admin \
  --master-user-password <senha> \
  --allocated-storage 20
```

**DigitalOcean**: Managed Database
**Railway**: PostgreSQL addon
**Supabase**: Opção gratuita até 500MB

#### Passo 2.2: Provisionar Redis

**AWS**: ElastiCache Redis
**Upstash**: Redis serverless (gratuito até 10k comandos/dia)
**Railway**: Redis addon

#### Passo 2.3: Provisionar Elasticsearch

**AWS**: OpenSearch Service
**Elastic Cloud**: Managed Elasticsearch
**Bonsai.io**: Elasticsearch hospedado

#### Passo 2.4: Configurar Storage S3

**AWS**: S3 Bucket
```bash
aws s3 mb s3://pim-assets-prod
```

**Cloudflare R2**: S3-compatible (sem egress fees)
**DigitalOcean Spaces**: S3-compatible

---

### FASE 3: CONTAINERIZAÇÃO E REGISTRO (1 dia)

#### Passo 3.1: Criar Conta em Container Registry

Opções:
- Docker Hub (gratuito para 1 repo privado)
- AWS ECR
- GitHub Container Registry (ghcr.io)
- DigitalOcean Container Registry

#### Passo 3.2: Build e Push das Imagens

```bash
# Backend
cd backend
docker build -t seu-registry/pim-backend:v1.0.0 .
docker push seu-registry/pim-backend:v1.0.0

# Frontend
cd ../frontend
docker build -t seu-registry/pim-frontend:v1.0.0 .
docker push seu-registry/pim-frontend:v1.0.0
```

#### Passo 3.3: Configurar CI/CD (Opcional mas Recomendado)

Criar `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloud

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Backend
        run: |
          cd backend
          docker build -t ${{ secrets.REGISTRY }}/pim-backend:${{ github.sha }} .

      - name: Build Frontend
        run: |
          cd frontend
          docker build -t ${{ secrets.REGISTRY }}/pim-frontend:${{ github.sha }} .

      - name: Push Images
        run: |
          docker push ${{ secrets.REGISTRY }}/pim-backend:${{ github.sha }}
          docker push ${{ secrets.REGISTRY }}/pim-frontend:${{ github.sha }}

      - name: Deploy
        # Comandos específicos do provider escolhido
```

---

### FASE 4: DEPLOYMENT DA APLICAÇÃO (1-2 dias)

#### Opção A: AWS ECS/Fargate (Enterprise)

```bash
# 1. Criar cluster ECS
aws ecs create-cluster --cluster-name pim-cluster

# 2. Criar task definitions (backend e frontend)
# 3. Criar serviços ECS
# 4. Configurar Application Load Balancer
# 5. Configurar Auto Scaling
```

#### Opção B: DigitalOcean App Platform (Simples)

```bash
# Via doctl CLI
doctl apps create --spec app-spec.yaml
```

Criar `app-spec.yaml`:
```yaml
name: pim-system
region: nyc
services:
  - name: backend
    github:
      repo: seu-usuario/pim
      branch: main
      deploy_on_push: true
    dockerfile_path: backend/Dockerfile
    http_port: 8080
    instance_size_slug: basic-xxs
    instance_count: 1
    envs:
      - key: SPRING_PROFILES_ACTIVE
        value: prod
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}

  - name: frontend
    github:
      repo: seu-usuario/pim
      branch: main
      deploy_on_push: true
    dockerfile_path: frontend/Dockerfile
    http_port: 3000
    instance_size_slug: basic-xxs
    instance_count: 1
    envs:
      - key: NEXT_PUBLIC_API_URL
        value: ${backend.PUBLIC_URL}

databases:
  - name: db
    engine: PG
    version: "16"
```

#### Opção C: Railway (Mais Simples)

```bash
# 1. Instalar CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Criar projeto
railway init

# 4. Adicionar serviços
railway add postgresql
railway add redis

# 5. Deploy
railway up
```

#### Opção D: Kubernetes (Avançado)

Criar arquivos em `k8s/`:

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pim-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pim-backend
  template:
    metadata:
      labels:
        app: pim-backend
    spec:
      containers:
      - name: backend
        image: seu-registry/pim-backend:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: pim-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
```

---

### FASE 5: DOMÍNIO E SSL (1 dia)

#### Passo 5.1: Registrar/Configurar Domínio

- Registrar domínio (Namecheap, GoDaddy, Cloudflare, etc.)
- Configurar DNS apontando para o cloud provider

#### Passo 5.2: Configurar SSL/HTTPS

**AWS**: ACM (Certificate Manager) - gratuito
**Cloudflare**: SSL gratuito + CDN
**Let's Encrypt**: Gratuito (via certbot)

#### Passo 5.3: Configurar Subdomínios

```
api.seudominio.com    → Backend (8080)
app.seudominio.com    → Frontend (3000)
```

---

### FASE 6: MONITORAMENTO E LOGS (1 dia)

#### Passo 6.1: Configurar Logging

**Opções gratuitas/baratas**:
- Papertrail
- Logtail
- Better Stack
- AWS CloudWatch

#### Passo 6.2: Configurar Monitoramento

O backend já tem métricas Prometheus prontas em `/actuator/prometheus`

**Opções**:
- Grafana Cloud (gratuito até 10k métricas)
- Datadog
- New Relic
- AWS CloudWatch

#### Passo 6.3: Configurar Alertas

- Alertas de erro 5xx
- Alertas de alta latência
- Alertas de uso de recursos
- Alertas de saúde do banco

---

### FASE 7: BACKUP E DISASTER RECOVERY (1 dia)

#### Passo 7.1: Configurar Backup do Banco

```bash
# Backup automático diário (cron)
0 3 * * * pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
```

**Managed databases** já incluem backup automático

#### Passo 7.2: Configurar Backup do Storage

- Versionamento no S3/R2
- Replicação cross-region (opcional)

#### Passo 7.3: Documentar Procedimento de Recovery

- [ ] Processo de restore do banco
- [ ] Processo de rollback de deploy
- [ ] Contatos de emergência

---

### FASE 8: SEGURANÇA (Contínuo)

#### Checklist de Segurança

- [ ] Todas as senhas são fortes e únicas
- [ ] JWT secret é de 256+ bits
- [ ] HTTPS habilitado em todas as rotas
- [ ] CORS configurado apenas para domínios necessários
- [ ] Rate limiting configurado
- [ ] Firewall/Security Groups configurados
- [ ] Acesso SSH via chave (não senha)
- [ ] Backup das chaves de acesso
- [ ] WAF configurado (opcional)
- [ ] Scan de vulnerabilidades periódico

---

## ESTIMATIVA DE CUSTOS MENSAIS

### Configuração Mínima (MVP/Startup)

| Serviço | Provider | Custo |
|---------|----------|-------|
| PostgreSQL | Supabase/Railway | $0-25 |
| Redis | Upstash | $0-10 |
| Backend | Railway/Fly.io | $5-20 |
| Frontend | Vercel/Netlify | $0-20 |
| Storage | Cloudflare R2 | $0-10 |
| **Total** | | **$5-85/mês** |

### Configuração Produção (SMB)

| Serviço | Provider | Custo |
|---------|----------|-------|
| PostgreSQL | DO Managed | $15-50 |
| Redis | DO Managed | $15-30 |
| Elasticsearch | Bonsai.io | $20-50 |
| Backend (2x) | DO App Platform | $24-48 |
| Frontend | Vercel Pro | $20 |
| Storage | DO Spaces | $5-20 |
| CDN | Cloudflare | $0-20 |
| **Total** | | **$100-250/mês** |

### Configuração Enterprise (AWS)

| Serviço | Provider | Custo |
|---------|----------|-------|
| PostgreSQL | RDS | $50-200 |
| Redis | ElastiCache | $30-100 |
| Elasticsearch | OpenSearch | $50-200 |
| Backend | ECS Fargate | $50-200 |
| Frontend | ECS/Amplify | $20-50 |
| Storage | S3 | $10-50 |
| Load Balancer | ALB | $20-50 |
| CDN | CloudFront | $10-50 |
| **Total** | | **$250-900/mês** |

---

## RECOMENDAÇÃO PARA COMEÇAR

### Para um primeiro deploy rápido, recomendo:

1. **Railway** (mais simples)
   - Deploy com 1 comando
   - PostgreSQL e Redis incluídos
   - SSL automático
   - CI/CD automático

2. **DigitalOcean App Platform** (bom custo-benefício)
   - Interface visual simples
   - Managed databases confiáveis
   - Preço previsível

3. **Vercel (Frontend) + Railway (Backend)** (performance)
   - Melhor edge network para frontend
   - Simples para backend

---

## PRÓXIMOS PASSOS IMEDIATOS

1. [ ] Escolher cloud provider
2. [ ] Criar conta no provider escolhido
3. [ ] Gerar novas credenciais para produção (JWT, DB, etc.)
4. [ ] Provisionar banco de dados
5. [ ] Fazer primeiro deploy do backend
6. [ ] Fazer primeiro deploy do frontend
7. [ ] Configurar domínio e SSL
8. [ ] Testar todas as funcionalidades
9. [ ] Configurar monitoramento
10. [ ] Configurar backups

---

## COMANDOS RÁPIDOS POR PROVIDER

### Railway (Mais Rápido)
```bash
npm install -g @railway/cli
railway login
railway init
railway add postgresql redis
cd backend && railway up
cd ../frontend && railway up
```

### Fly.io
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
fly launch  # backend
fly launch  # frontend
fly postgres create
fly redis create
```

### DigitalOcean
```bash
doctl auth init
doctl apps create --spec app-spec.yaml
```

---

**Documento criado em**: $(date)
**Versão**: 1.0
**Sistema**: PIM - Product Information Management
