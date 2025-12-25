# Arquitetura de Produção - PIM System

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 INTERNET                                    │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOUDFLARE                                     │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│  │   WAF / DDoS    │    │  SSL/TLS Term   │    │         CDN             │ │
│  │   Protection    │    │  (Certificados) │    │   (Assets Estáticos)    │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘ │
│                                                                             │
│  DNS: app.pim.com.br → Frontend    api.pim.com.br → Backend                │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOAD BALANCER                                     │
│                    (AWS ALB / DigitalOcean LB)                              │
│                                                                             │
│         ┌──────────────────────┐    ┌──────────────────────┐               │
│         │   app.pim.com.br    │    │   api.pim.com.br     │               │
│         │      Port 443       │    │      Port 443        │               │
│         └──────────┬──────────┘    └──────────┬───────────┘               │
└────────────────────┼──────────────────────────┼─────────────────────────────┘
                     │                          │
                     ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTAINER ORCHESTRATION                             │
│                      (Docker Swarm / Kubernetes / ECS)                      │
│                                                                             │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────────┐│
│  │        FRONTEND             │    │            BACKEND                  ││
│  │       (Next.js 14)          │    │       (Spring Boot 3.4)             ││
│  │                             │    │                                     ││
│  │  ┌───────┐    ┌───────┐    │    │  ┌───────┐  ┌───────┐  ┌───────┐   ││
│  │  │ App 1 │    │ App 2 │    │    │  │ App 1 │  │ App 2 │  │ App 3 │   ││
│  │  │ :3000 │    │ :3000 │    │    │  │ :8080 │  │ :8080 │  │ :8080 │   ││
│  │  └───────┘    └───────┘    │    │  └───────┘  └───────┘  └───────┘   ││
│  │                             │    │                                     ││
│  │  CPU: 0.5    RAM: 512MB    │    │  CPU: 1.0    RAM: 1GB               ││
│  │  Min: 2      Max: 4        │    │  Min: 2      Max: 6                 ││
│  └─────────────────────────────┘    └──────────────┬──────────────────────┘│
│                                                     │                       │
└─────────────────────────────────────────────────────┼───────────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            REDE PRIVADA (VPC)                               │
│                         10.0.0.0/16 - Sem acesso externo                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         CAMADA DE DADOS                             │   │
│  │                                                                     │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │   │
│  │  │   PostgreSQL    │  │      Redis      │  │    Elasticsearch    │ │   │
│  │  │       16        │  │        7        │  │        8.11         │ │   │
│  │  │                 │  │                 │  │                     │ │   │
│  │  │  ┌─────┐┌─────┐│  │    ┌───────┐   │  │   ┌─────┐┌─────┐   │ │   │
│  │  │  │ Pri ││ Rep ││  │    │Primary│   │  │   │Node1││Node2│   │ │   │
│  │  │  │mary ││lica ││  │    │ 6379  │   │  │   │ 9200││ 9200│   │ │   │
│  │  │  └─────┘└─────┘│  │    └───────┘   │  │   └─────┘└─────┘   │ │   │
│  │  │   Port: 5432   │  │   Port: 6379   │  │    Port: 9200      │ │   │
│  │  │   Storage: SSD │  │   RAM: 1GB     │  │    RAM: 2GB        │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       CAMADA DE MENSAGERIA                          │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                     Apache Kafka                            │   │   │
│  │  │                                                             │   │   │
│  │  │   ┌─────────┐  ┌─────────┐  ┌─────────┐                   │   │   │
│  │  │   │Broker 1 │  │Broker 2 │  │Broker 3 │                   │   │   │
│  │  │   │  :9092  │  │  :9092  │  │  :9092  │                   │   │   │
│  │  │   └─────────┘  └─────────┘  └─────────┘                   │   │   │
│  │  │                                                             │   │   │
│  │  │   Topics: pim.product.events, pim.category.events,         │   │   │
│  │  │           pim.import.events, pim.quality.events            │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      CAMADA DE STORAGE                              │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │               S3 / Cloudflare R2 / MinIO                    │   │   │
│  │  │                                                             │   │   │
│  │  │   Bucket: pim-assets-prod                                   │   │   │
│  │  │   - /products/      → Imagens de produtos                  │   │   │
│  │  │   - /imports/       → Arquivos de importação               │   │   │
│  │  │   - /exports/       → Arquivos de exportação               │   │   │
│  │  │   - /temp/          → Arquivos temporários                 │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           OBSERVABILIDADE                                   │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │    Prometheus   │  │     Grafana     │  │         Logging             │ │
│  │                 │  │                 │  │                             │ │
│  │  Métricas do    │  │  Dashboards e   │  │  - Aplicação (JSON)        │ │
│  │  /actuator/     │  │  Visualização   │  │  - Access Logs             │ │
│  │  prometheus     │  │                 │  │  - Error Tracking          │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          ALERTAS                                    │   │
│  │  - CPU > 80% por 5 min          - Error rate > 1%                  │   │
│  │  - Memory > 85%                 - Response time > 2s               │   │
│  │  - Disk > 80%                   - Service down                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Requisições

```
┌──────────┐     ┌───────────┐     ┌────────────┐     ┌──────────┐
│  Usuário │────▶│ Cloudflare│────▶│    ALB     │────▶│ Frontend │
│ (Browser)│     │  (CDN/WAF)│     │            │     │ (Next.js)│
└──────────┘     └───────────┘     └────────────┘     └────┬─────┘
                                                           │
                      ┌────────────────────────────────────┘
                      │ SSR ou Client-side API calls
                      ▼
                ┌────────────┐     ┌──────────────────────────────┐
                │    ALB     │────▶│          Backend             │
                │            │     │       (Spring Boot)          │
                └────────────┘     └──────────────┬───────────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────┐
                    │                             │                 │
                    ▼                             ▼                 ▼
              ┌──────────┐               ┌──────────────┐    ┌───────────┐
              │PostgreSQL│               │Elasticsearch │    │   Redis   │
              │  (CRUD)  │               │   (Search)   │    │  (Cache)  │
              └──────────┘               └──────────────┘    └───────────┘
```

---

## Especificações Técnicas

### Dimensionamento Recomendado

| Componente | Mínimo (MVP) | Produção | Enterprise |
|------------|--------------|----------|------------|
| **Frontend** | 1x 0.5CPU/512MB | 2x 1CPU/1GB | 4x 2CPU/2GB |
| **Backend** | 1x 1CPU/1GB | 3x 2CPU/2GB | 6x 4CPU/4GB |
| **PostgreSQL** | 1x 1CPU/1GB | 2x 2CPU/4GB | 2x 4CPU/8GB |
| **Redis** | 1x 256MB | 1x 1GB | 3x 2GB (Cluster) |
| **Elasticsearch** | 1x 1GB | 2x 2GB | 3x 4GB |
| **Kafka** | - | 1x 1GB | 3x 2GB |

### Portas e Protocolos

| Serviço | Porta Interna | Porta Externa | Protocolo |
|---------|---------------|---------------|-----------|
| Frontend | 3000 | 443 (HTTPS) | HTTP/2 |
| Backend | 8080 | 443 (HTTPS) | HTTP/2 |
| PostgreSQL | 5432 | - | TCP |
| Redis | 6379 | - | TCP |
| Elasticsearch | 9200 | - | HTTP |
| Kafka | 9092 | - | TCP |

### Requisitos de Rede

```
VPC CIDR: 10.0.0.0/16

Subnets:
├── Public Subnet (Load Balancer)
│   └── 10.0.1.0/24, 10.0.2.0/24 (Multi-AZ)
│
├── Private Subnet (Applications)
│   └── 10.0.10.0/24, 10.0.11.0/24 (Multi-AZ)
│
└── Database Subnet (Data Layer)
    └── 10.0.20.0/24, 10.0.21.0/24 (Multi-AZ)
```

---

## Segurança

### Security Groups

```
┌─────────────────────────────────────────────────────────────┐
│                    SG: Load Balancer                        │
│  Inbound:  443 (HTTPS) from 0.0.0.0/0                      │
│  Outbound: All to VPC                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SG: Applications                         │
│  Inbound:  3000, 8080 from SG-LoadBalancer                 │
│  Outbound: All to VPC + Internet (APIs externas)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SG: Databases                            │
│  Inbound:  5432, 6379, 9200, 9092 from SG-Applications     │
│  Outbound: None                                             │
└─────────────────────────────────────────────────────────────┘
```

### Checklist de Segurança

- [ ] SSL/TLS em todas as conexões externas
- [ ] Secrets em Secret Manager (não em código)
- [ ] JWT com chave de 256+ bits
- [ ] Rate limiting no API Gateway
- [ ] WAF habilitado (Cloudflare/AWS WAF)
- [ ] Logs de auditoria habilitados
- [ ] Backup encriptado
- [ ] Acesso SSH apenas via bastion host

---

## Alta Disponibilidade

```
                    ┌─────────────────────┐
                    │   Availability      │
                    │     Zone A          │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │   Frontend    │  │
                    │  │   Backend     │  │
                    │  │   PostgreSQL  │◀─┼──── Replicação
                    │  │   (Primary)   │  │     Síncrona
                    │  └───────────────┘  │
                    └─────────────────────┘
                              │
                              │ Failover Automático
                              ▼
                    ┌─────────────────────┐
                    │   Availability      │
                    │     Zone B          │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │   Frontend    │  │
                    │  │   Backend     │  │
                    │  │   PostgreSQL  │  │
                    │  │   (Replica)   │  │
                    │  └───────────────┘  │
                    └─────────────────────┘
```

---

## Estratégia de Backup

| Dados | Frequência | Retenção | Tipo |
|-------|------------|----------|------|
| PostgreSQL | Diário + Contínuo (WAL) | 30 dias | Automático |
| Redis | Snapshot diário | 7 dias | Automático |
| Elasticsearch | Snapshot diário | 14 dias | Manual/Automático |
| S3 Assets | Versionamento | 90 dias | Automático |
| Configs | Git | Permanente | Manual |

---

## Estimativa de Custos

### DigitalOcean (Recomendado para Começar)

| Recurso | Especificação | Custo/Mês |
|---------|---------------|-----------|
| App Platform (Frontend) | 2x Basic ($12) | $24 |
| App Platform (Backend) | 2x Professional ($25) | $50 |
| Managed PostgreSQL | Basic ($15) | $15 |
| Managed Redis | Basic ($15) | $15 |
| Spaces (S3) | 250GB | $5 |
| Load Balancer | Regional | $12 |
| **Total** | | **~$121/mês** |

### AWS (Produção)

| Recurso | Especificação | Custo/Mês |
|---------|---------------|-----------|
| ECS Fargate (Frontend) | 2x 0.5vCPU/1GB | $30 |
| ECS Fargate (Backend) | 3x 1vCPU/2GB | $90 |
| RDS PostgreSQL | db.t3.medium | $50 |
| ElastiCache Redis | cache.t3.micro | $25 |
| OpenSearch | t3.small.search | $40 |
| S3 | 100GB | $5 |
| ALB | Regional | $25 |
| CloudFront | 100GB transfer | $10 |
| **Total** | | **~$275/mês** |
