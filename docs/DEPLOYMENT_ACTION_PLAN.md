# Plano de Ação - Deploy do PIM na Nuvem

## Resumo Executivo

| Fase | Descrição | Duração Estimada |
|------|-----------|------------------|
| 1 | Preparação e Configuração | 1 dia |
| 2 | Infraestrutura de Dados | 1 dia |
| 3 | Deploy das Aplicações | 1 dia |
| 4 | DNS, SSL e CDN | 0.5 dia |
| 5 | Monitoramento e Alertas | 0.5 dia |
| 6 | Testes e Go-Live | 1 dia |
| **Total** | | **5 dias** |

---

# FASE 1: PREPARAÇÃO E CONFIGURAÇÃO

## Passo 1.1: Escolher Cloud Provider

**Recomendação**: DigitalOcean (melhor custo-benefício para começar)

```bash
# Criar conta em: https://www.digitalocean.com/
# Ou AWS: https://aws.amazon.com/
```

## Passo 1.2: Instalar Ferramentas CLI

```bash
# DigitalOcean CLI
brew install doctl  # macOS
# ou
snap install doctl  # Linux

# AWS CLI (se usar AWS)
brew install awscli
# ou
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Docker (necessário)
# https://docs.docker.com/get-docker/

# Autenticar
doctl auth init
# ou
aws configure
```

## Passo 1.3: Gerar Credenciais de Produção

```bash
# 1. Gerar JWT Secret (256 bits = 32 bytes)
openssl rand -base64 32
# Exemplo: K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=

# 2. Gerar senha do banco de dados
openssl rand -base64 24
# Exemplo: aB3dE5fG7hI9jK1lM3nO5pQ7rS

# 3. Gerar API Key para integrações
openssl rand -hex 32
# Exemplo: a1b2c3d4e5f6789...
```

## Passo 1.4: Criar Arquivo de Variáveis de Ambiente

Criar arquivo `deploy/.env.production`:

```bash
mkdir -p deploy
cat > deploy/.env.production << 'EOF'
# ===========================================
# CONFIGURAÇÕES DE PRODUÇÃO - PIM SYSTEM
# ===========================================

# Ambiente
ENVIRONMENT=production
LOG_LEVEL=WARN

# ----- DATABASE -----
DATABASE_HOST=<será_preenchido>
DATABASE_PORT=5432
DATABASE_NAME=pim
DATABASE_USER=pim_admin
DATABASE_PASSWORD=<senha_gerada>
DATABASE_URL=postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}

# ----- REDIS -----
REDIS_HOST=<será_preenchido>
REDIS_PORT=6379
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}

# ----- ELASTICSEARCH -----
ELASTICSEARCH_HOST=<será_preenchido>
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_URL=http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}

# ----- STORAGE (S3) -----
S3_ENDPOINT=<será_preenchido>
S3_BUCKET=pim-assets-prod
S3_ACCESS_KEY=<será_preenchido>
S3_SECRET_KEY=<será_preenchido>
S3_REGION=nyc3

# ----- JWT -----
JWT_SECRET=<chave_gerada_256bits>
JWT_EXPIRATION=86400000

# ----- KAFKA (opcional) -----
KAFKA_ENABLED=false
KAFKA_BOOTSTRAP_SERVERS=<será_preenchido>

# ----- FRONTEND -----
NEXT_PUBLIC_API_URL=https://api.seudominio.com.br

# ----- DOMÍNIOS -----
DOMAIN_FRONTEND=app.seudominio.com.br
DOMAIN_BACKEND=api.seudominio.com.br
EOF
```

## Passo 1.5: Atualizar Configuração do Backend

Editar `backend/src/main/resources/application.yml` para usar variáveis de ambiente:

```yaml
# Adicionar profile de produção
---
spring:
  config:
    activate:
      on-profile: prod

  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USER}
    password: ${DATABASE_PASSWORD}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5

  data:
    redis:
      host: ${REDIS_HOST}
      port: ${REDIS_PORT:6379}

  elasticsearch:
    uris: ${ELASTICSEARCH_URL}

jwt:
  secret: ${JWT_SECRET}
  expiration: ${JWT_EXPIRATION:86400000}

minio:
  endpoint: ${S3_ENDPOINT}
  access-key: ${S3_ACCESS_KEY}
  secret-key: ${S3_SECRET_KEY}
  bucket: ${S3_BUCKET}

logging:
  level:
    root: WARN
    com.pim: INFO
```

---

# FASE 2: INFRAESTRUTURA DE DADOS

## Passo 2.1: Criar Banco de Dados PostgreSQL

### DigitalOcean:
```bash
# Criar cluster PostgreSQL
doctl databases create pim-postgres \
  --engine pg \
  --version 16 \
  --region nyc1 \
  --size db-s-1vcpu-1gb \
  --num-nodes 1

# Obter connection string
doctl databases connection pim-postgres --format Host,Port,User,Password

# Criar database 'pim'
doctl databases db create pim-postgres pim
```

### AWS RDS:
```bash
aws rds create-db-instance \
  --db-instance-identifier pim-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username pim_admin \
  --master-user-password "<SENHA>" \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name default \
  --backup-retention-period 7 \
  --no-publicly-accessible
```

## Passo 2.2: Criar Redis

### DigitalOcean:
```bash
doctl databases create pim-redis \
  --engine redis \
  --version 7 \
  --region nyc1 \
  --size db-s-1vcpu-1gb \
  --num-nodes 1

# Obter connection info
doctl databases connection pim-redis
```

### AWS ElastiCache:
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id pim-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxx \
  --cache-subnet-group-name default
```

## Passo 2.3: Criar Storage S3

### DigitalOcean Spaces:
```bash
# Criar Space (S3-compatible)
doctl compute cdn create \
  --origin pim-assets.nyc3.digitaloceanspaces.com

# Via interface web: https://cloud.digitalocean.com/spaces
# Criar: pim-assets
# Região: nyc3
# CDN: Habilitar
```

### AWS S3:
```bash
# Criar bucket
aws s3 mb s3://pim-assets-prod --region us-east-1

# Configurar CORS
aws s3api put-bucket-cors --bucket pim-assets-prod --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://app.seudominio.com.br"],
    "MaxAgeSeconds": 3600
  }]
}'

# Bloquear acesso público (usar signed URLs)
aws s3api put-public-access-block --bucket pim-assets-prod \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

## Passo 2.4: Configurar Elasticsearch (Opcional para MVP)

### Elastic Cloud (Recomendado):
```bash
# Criar conta em: https://cloud.elastic.co/
# Criar deployment:
#   - Nome: pim-search
#   - Versão: 8.11
#   - Tamanho: 1GB RAM
#   - Região: us-east-1
```

### Bonsai.io (Alternativa mais barata):
```bash
# https://bonsai.io/
# Plano Sandbox: Gratuito (10MB)
# Plano Starter: $10/mês (125MB)
```

## Passo 2.5: Executar Migrations do Banco

```bash
# Conectar ao banco via psql
psql $DATABASE_URL

# Ou rodar a aplicação uma vez para executar migrations
# As migrations Flyway rodarão automaticamente no startup
```

---

# FASE 3: DEPLOY DAS APLICAÇÕES

## Passo 3.1: Configurar Container Registry

### Docker Hub:
```bash
docker login

# Tag e push das imagens
docker build -t seuusuario/pim-backend:v1.0.0 ./backend
docker build -t seuusuario/pim-frontend:v1.0.0 ./frontend

docker push seuusuario/pim-backend:v1.0.0
docker push seuusuario/pim-frontend:v1.0.0
```

### DigitalOcean Container Registry:
```bash
doctl registry create pim-registry

# Autenticar Docker
doctl registry login

# Tag e push
docker tag pim-backend:latest registry.digitalocean.com/pim-registry/pim-backend:v1.0.0
docker push registry.digitalocean.com/pim-registry/pim-backend:v1.0.0

docker tag pim-frontend:latest registry.digitalocean.com/pim-registry/pim-frontend:v1.0.0
docker push registry.digitalocean.com/pim-registry/pim-frontend:v1.0.0
```

## Passo 3.2: Deploy no DigitalOcean App Platform

Criar arquivo `deploy/app-spec.yaml`:

```yaml
name: pim-system
region: nyc
features:
  - buildpack-stack=ubuntu-22

services:
  # Backend Spring Boot
  - name: backend
    git:
      repo_clone_url: https://github.com/seu-usuario/pim.git
      branch: main
    dockerfile_path: backend/Dockerfile
    source_dir: /
    http_port: 8080
    instance_count: 2
    instance_size_slug: professional-xs
    health_check:
      http_path: /actuator/health
      initial_delay_seconds: 60
      period_seconds: 10
    envs:
      - key: SPRING_PROFILES_ACTIVE
        value: prod
      - key: DATABASE_URL
        value: ${db-postgres.DATABASE_URL}
      - key: REDIS_HOST
        value: ${db-redis.HOSTNAME}
      - key: REDIS_PORT
        value: ${db-redis.PORT}
      - key: JWT_SECRET
        type: SECRET
        value: "<seu_jwt_secret>"
      - key: S3_ENDPOINT
        value: "https://nyc3.digitaloceanspaces.com"
      - key: S3_ACCESS_KEY
        type: SECRET
        value: "<seu_spaces_key>"
      - key: S3_SECRET_KEY
        type: SECRET
        value: "<seu_spaces_secret>"
      - key: S3_BUCKET
        value: "pim-assets"

  # Frontend Next.js
  - name: frontend
    git:
      repo_clone_url: https://github.com/seu-usuario/pim.git
      branch: main
    dockerfile_path: frontend/Dockerfile
    source_dir: /
    http_port: 3000
    instance_count: 2
    instance_size_slug: basic-xxs
    routes:
      - path: /
    envs:
      - key: NEXT_PUBLIC_API_URL
        value: ${backend.PUBLIC_URL}

databases:
  - name: db-postgres
    engine: PG
    version: "16"
    size: db-s-1vcpu-1gb
    num_nodes: 1

  - name: db-redis
    engine: REDIS
    version: "7"
    size: db-s-1vcpu-1gb
    num_nodes: 1
```

Deploy:
```bash
doctl apps create --spec deploy/app-spec.yaml

# Verificar status
doctl apps list
doctl apps logs <app-id> --type=run
```

## Passo 3.3: Deploy Alternativo com Docker Compose (VPS)

Se preferir usar um VPS (Droplet/EC2):

Criar `deploy/docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: ${REGISTRY}/pim-backend:${VERSION:-latest}
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - JWT_SECRET=${JWT_SECRET}
      - S3_ENDPOINT=${S3_ENDPOINT}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
      - S3_BUCKET=${S3_BUCKET}
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
    networks:
      - pim-network

  frontend:
    image: ${REGISTRY}/pim-frontend:${VERSION:-latest}
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.${DOMAIN}
    depends_on:
      - backend
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    networks:
      - pim-network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    networks:
      - pim-network

networks:
  pim-network:
    driver: bridge
```

Script de deploy:
```bash
#!/bin/bash
# deploy/deploy.sh

set -e

echo "🚀 Iniciando deploy do PIM..."

# Carregar variáveis
source .env.production

# Pull das imagens mais recentes
docker-compose -f docker-compose.prod.yml pull

# Deploy com zero-downtime
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale backend=3 backend
sleep 30
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale backend=2 backend

docker-compose -f docker-compose.prod.yml up -d --no-deps --scale frontend=3 frontend
sleep 30
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale frontend=2 frontend

echo "✅ Deploy concluído!"
docker-compose -f docker-compose.prod.yml ps
```

---

# FASE 4: DNS, SSL E CDN

## Passo 4.1: Configurar Cloudflare (Recomendado)

```bash
# 1. Criar conta em https://cloudflare.com

# 2. Adicionar seu domínio

# 3. Atualizar nameservers no registrador do domínio

# 4. Configurar DNS records:
#    - A record: app.seudominio.com.br → IP do Load Balancer
#    - A record: api.seudominio.com.br → IP do Load Balancer
#    - CNAME: assets.seudominio.com.br → bucket.s3.amazonaws.com

# 5. Habilitar:
#    - SSL/TLS: Full (strict)
#    - Always Use HTTPS: On
#    - Automatic HTTPS Rewrites: On
#    - Brotli: On
#    - HTTP/3: On
```

## Passo 4.2: Configurar SSL com Let's Encrypt (Alternativa)

```bash
# No servidor VPS
sudo apt install certbot

# Gerar certificados
sudo certbot certonly --standalone \
  -d app.seudominio.com.br \
  -d api.seudominio.com.br

# Renovação automática (cron)
0 0 1 * * certbot renew --quiet
```

## Passo 4.3: Configurar CDN para Assets

```bash
# Cloudflare (já incluso no plano gratuito)
# Configurar Page Rules:

# Cache de assets estáticos
# URL: *seudominio.com.br/assets/*
# Setting: Cache Level = Cache Everything
# Edge Cache TTL: 1 month

# Bypass cache para API
# URL: api.seudominio.com.br/*
# Setting: Cache Level = Bypass
```

---

# FASE 5: MONITORAMENTO E ALERTAS

## Passo 5.1: Configurar Logging

### Papertrail (Simples):
```bash
# 1. Criar conta: https://papertrailapp.com
# 2. Criar Log Destination
# 3. Configurar no docker-compose:

logging:
  driver: syslog
  options:
    syslog-address: "udp://logs.papertrailapp.com:XXXXX"
    tag: "{{.Name}}"
```

### Better Stack (Alternativa):
```bash
# 1. Criar conta: https://betterstack.com
# 2. Obter source token
# 3. Adicionar variável de ambiente:
#    LOGTAIL_SOURCE_TOKEN=xxx
```

## Passo 5.2: Configurar Métricas com Grafana Cloud

```bash
# 1. Criar conta: https://grafana.com/products/cloud/
# 2. Criar stack (gratuito até 10k métricas)
# 3. Configurar Prometheus remote write

# Adicionar ao backend (já configurado):
# GET /actuator/prometheus → Métricas Prometheus

# Configurar scrape no Grafana Cloud:
# Job: pim-backend
# Target: https://api.seudominio.com.br/actuator/prometheus
```

## Passo 5.3: Configurar Alertas

### Alertas Recomendados:

```yaml
# alerts.yml (Grafana/Prometheus)
groups:
  - name: pim-alerts
    rules:
      # Backend down
      - alert: BackendDown
        expr: up{job="pim-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Backend está fora do ar"

      # Alta latência
      - alert: HighLatency
        expr: http_server_requests_seconds_sum / http_server_requests_seconds_count > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Latência acima de 2 segundos"

      # Erro rate alto
      - alert: HighErrorRate
        expr: rate(http_server_requests_seconds_count{status=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Taxa de erros 5xx acima de 1%"

      # Banco de dados lento
      - alert: SlowDatabase
        expr: hikaricp_connections_acquire_seconds_sum > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Conexões de banco lentas"
```

## Passo 5.4: Configurar Uptime Monitoring

```bash
# Opções gratuitas:
# - UptimeRobot: https://uptimerobot.com (50 monitores grátis)
# - Better Uptime: https://betteruptime.com
# - Pingdom: https://pingdom.com

# Configurar checks:
# - https://app.seudominio.com.br (Frontend)
# - https://api.seudominio.com.br/actuator/health (Backend)
```

---

# FASE 6: TESTES E GO-LIVE

## Passo 6.1: Checklist Pré-Go-Live

```markdown
### Infraestrutura
- [ ] Banco de dados criado e acessível
- [ ] Redis criado e acessível
- [ ] S3/Spaces criado e configurado
- [ ] Migrations executadas com sucesso

### Aplicação
- [ ] Backend deployado e saudável
- [ ] Frontend deployado e acessível
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets armazenados de forma segura

### Segurança
- [ ] HTTPS habilitado em todos os endpoints
- [ ] CORS configurado corretamente
- [ ] JWT secret é forte (256+ bits)
- [ ] Rate limiting configurado
- [ ] Firewall/Security Groups configurados

### DNS/CDN
- [ ] DNS propagado (pode levar até 48h)
- [ ] SSL/TLS funcionando
- [ ] CDN cacheando assets

### Monitoramento
- [ ] Logs centralizados
- [ ] Métricas coletadas
- [ ] Alertas configurados
- [ ] Uptime monitoring ativo

### Backup
- [ ] Backup automático do banco habilitado
- [ ] Teste de restore realizado
```

## Passo 6.2: Testes Funcionais

```bash
# 1. Testar health check do backend
curl https://api.seudominio.com.br/actuator/health
# Esperado: {"status":"UP"}

# 2. Testar API de login
curl -X POST https://api.seudominio.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pim.com","password":"admin123"}'
# Esperado: Token JWT

# 3. Testar frontend
curl -I https://app.seudominio.com.br
# Esperado: HTTP/2 200

# 4. Testar upload de arquivos
# (via interface ou curl com arquivo)

# 5. Testar busca (se Elasticsearch configurado)
curl https://api.seudominio.com.br/api/products/search?q=teste
```

## Passo 6.3: Testes de Carga (Opcional)

```bash
# Instalar k6
brew install k6

# Criar script de teste
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 20 },   // Stay
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  const res = http.get('https://api.seudominio.com.br/api/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
EOF

# Executar
k6 run load-test.js
```

## Passo 6.4: Go-Live

```bash
# 1. Comunicar stakeholders
# 2. Atualizar DNS final (se usando temporário)
# 3. Monitorar logs nas primeiras horas
# 4. Ter rollback plan pronto

# Script de rollback (se necessário)
#!/bin/bash
# rollback.sh
docker-compose -f docker-compose.prod.yml pull backend:previous
docker-compose -f docker-compose.prod.yml up -d backend
```

---

# PÓS-DEPLOY: MANUTENÇÃO

## Atualizações Futuras

```bash
# 1. Build nova versão
docker build -t pim-backend:v1.1.0 ./backend
docker build -t pim-frontend:v1.1.0 ./frontend

# 2. Push para registry
docker push registry/pim-backend:v1.1.0
docker push registry/pim-frontend:v1.1.0

# 3. Atualizar App Platform
doctl apps update <app-id> --spec deploy/app-spec.yaml

# Ou Docker Compose
VERSION=v1.1.0 docker-compose -f docker-compose.prod.yml up -d
```

## Backup Manual do Banco

```bash
# Dump
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql $DATABASE_URL < backup_20240115_120000.sql
```

## Escalar Serviços

```bash
# DigitalOcean App Platform
doctl apps update <app-id> --spec updated-spec.yaml

# Docker Compose
docker-compose -f docker-compose.prod.yml up -d --scale backend=4
```

---

# RESUMO DE COMANDOS RÁPIDOS

```bash
# ========== SETUP INICIAL ==========
# Instalar CLI
brew install doctl docker

# Autenticar
doctl auth init

# ========== DEPLOY COMPLETO ==========
# 1. Provisionar infra
doctl databases create pim-postgres --engine pg --version 16 --size db-s-1vcpu-1gb
doctl databases create pim-redis --engine redis --version 7 --size db-s-1vcpu-1gb

# 2. Build e push
docker build -t registry.digitalocean.com/pim/backend:v1 ./backend
docker build -t registry.digitalocean.com/pim/frontend:v1 ./frontend
docker push registry.digitalocean.com/pim/backend:v1
docker push registry.digitalocean.com/pim/frontend:v1

# 3. Deploy app
doctl apps create --spec deploy/app-spec.yaml

# 4. Verificar
doctl apps list
curl https://api.seudominio.com.br/actuator/health

# ========== OPERAÇÕES DIÁRIAS ==========
# Ver logs
doctl apps logs <app-id>

# Escalar
doctl apps update <app-id> --spec deploy/app-spec.yaml

# Restart
doctl apps restart <app-id>
```

---

**Documento criado em**: 2024
**Versão**: 1.0
**Sistema**: PIM - Product Information Management
