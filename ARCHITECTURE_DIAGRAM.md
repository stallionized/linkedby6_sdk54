# Architecture Diagrams

This document contains Mermaid diagrams that visualize the system architecture. These render automatically on GitHub.

---

## System Overview

```mermaid
graph TB
    subgraph "React Native App"
        A[SearchScreen] --> B[searchService.js]
        B --> C[Supabase Client]
    end

    subgraph "Supabase Edge Functions"
        D[chat_search]
        E[generate_embeddings]
    end

    subgraph "Postgres + pgvector"
        F[business_profiles<br/>with embeddings]
        G[search_history<br/>analytics]
        H[Vector Search Functions]
    end

    subgraph "External APIs"
        I[OpenAI API<br/>Embeddings + LLM]
    end

    C -->|HTTPS| D
    C -->|HTTPS| E
    D -->|SQL/RPC| F
    D -->|SQL/RPC| G
    D -->|SQL/RPC| H
    E -->|SQL/RPC| F
    D -->|API Call| I
    E -->|API Call| I

    style A fill:#e1f5ff
    style D fill:#ffe1f5
    style E fill:#ffe1f5
    style F fill:#f5ffe1
    style G fill:#f5ffe1
    style I fill:#fff4e1
```

---

## Search Flow - Clear Query

```mermaid
sequenceDiagram
    participant U as User
    participant A as SearchScreen
    participant S as searchService
    participant E as Edge Function<br/>(chat_search)
    participant O as OpenAI API
    participant P as Postgres<br/>(pgvector)

    U->>A: "Find plumbers in Chicago"
    A->>S: performConversationalSearch()
    S->>E: POST /chat_search

    E->>O: Generate embedding
    O-->>E: [0.1, 0.5, ...]

    E->>O: Analyze query (LLM)
    O-->>E: {needs_clarification: false,<br/>filters: {category: "plumbing",<br/>location: "Chicago"}}

    E->>P: search_businesses_by_vector()
    P-->>E: [5 businesses with similarity]

    E->>P: log_search()
    P-->>E: search_id

    E-->>S: {type: "results",<br/>business_ids: [...]}
    S->>P: Fetch full profiles
    P-->>S: Business details
    S-->>A: Results
    A-->>U: Display business cards
```

---

## Search Flow - Clarification Needed

```mermaid
sequenceDiagram
    participant U as User
    participant A as SearchScreen
    participant E as Edge Function<br/>(chat_search)
    participant O as OpenAI API
    participant P as Postgres

    U->>A: "Show me businesses"
    A->>E: POST /chat_search

    E->>O: Generate embedding
    O-->>E: [0.2, 0.3, ...]

    E->>O: Analyze query (LLM)
    O-->>E: {needs_clarification: true,<br/>question: "What type?"}

    E->>P: log_search(clarification=true)
    P-->>E: search_id

    E-->>A: {type: "clarification",<br/>question: "What type?"}
    A-->>U: "What type of businesses<br/>are you looking for?"

    U->>A: "plumbers"
    Note over A,P: Continues with clear query flow...
```

---

## Embedding Generation Flow

```mermaid
sequenceDiagram
    participant S as Script/Scheduler
    participant E as Edge Function<br/>(generate_embeddings)
    participant P as Postgres
    participant O as OpenAI API

    S->>E: POST /generate_embeddings<br/>{batch_size: 100}

    E->>P: get_businesses_needing_embeddings()
    P-->>E: [100 businesses without embeddings]

    loop For each batch of 10
        E->>E: Create text:<br/>"Name: X\nIndustry: Y\nDesc: Z"
        E->>O: Generate embeddings (batch)
        O-->>E: [embeddings array]
        E->>P: UPDATE business_profiles<br/>SET embedding = [...]
        P-->>E: Success
    end

    E-->>S: {processed: 100,<br/>failed: 0,<br/>time_ms: 35000}
```

---

## Database Schema

```mermaid
erDiagram
    BUSINESS_PROFILES {
        uuid business_id PK
        text business_name
        text description
        text industry
        vector_1536 embedding
        timestamptz embedding_generated_at
        text embedding_model
        text city
        text state
        text coverage_type
    }

    SEARCH_HISTORY {
        uuid id PK
        text session_id
        uuid user_id FK
        text query_text
        vector_1536 query_embedding
        jsonb filters
        boolean is_clarification_needed
        text clarification_question
        uuid_array business_ids_returned
        int result_count
        int response_time_ms
        timestamptz created_at
    }

    AUTH_USERS {
        uuid id PK
        text email
        timestamptz created_at
    }

    SEARCH_HISTORY ||--o| AUTH_USERS : "user_id"
    BUSINESS_PROFILES ||--o{ SEARCH_HISTORY : "returned in"
```

---

## Data Flow - Vector Search

```mermaid
flowchart LR
    A[User Query] --> B[Generate<br/>Embedding]
    B --> C{Check<br/>Cache}

    C -->|Cache Hit| D[Return<br/>Cached Results]
    C -->|Cache Miss| E[Vector<br/>Similarity<br/>Search]

    E --> F{Apply<br/>Filters}
    F -->|Category| G[Filter by<br/>Industry]
    F -->|Location| H[Filter by<br/>City/State]
    F -->|Coverage| I[Filter by<br/>Coverage Type]

    G --> J[Rank by<br/>Similarity]
    H --> J
    I --> J

    J --> K[Top N<br/>Results]
    K --> L[Log to<br/>search_history]
    L --> M[Return<br/>to User]

    D --> M

    style B fill:#e1f5ff
    style E fill:#ffe1f5
    style J fill:#f5ffe1
    style L fill:#fff4e1
```

---

## Component Dependencies

```mermaid
graph TD
    subgraph "Frontend"
        A[SearchScreen.js]
        B[searchService.js]
        C[supabaseClient.js]
    end

    subgraph "Edge Functions"
        D[chat_search/index.ts]
        E[generate_embeddings/index.ts]
    end

    subgraph "Database Functions"
        F[search_businesses_by_vector]
        G[find_similar_searches]
        H[log_search]
        I[get_businesses_needing_embeddings]
    end

    subgraph "Tables"
        J[business_profiles]
        K[search_history]
    end

    A --> B
    B --> C
    C --> D
    C --> E
    D --> F
    D --> G
    D --> H
    E --> I
    F --> J
    G --> K
    H --> K
    I --> J

    style A fill:#e1f5ff
    style D fill:#ffe1f5
    style E fill:#ffe1f5
    style F fill:#f5ffe1
    style J fill:#fff4e1
```

---

## Scaling Strategy

```mermaid
graph TB
    subgraph "Load Distribution"
        A[1-100 req/s] -->|Edge Functions<br/>Auto-scale| B[Function Instances]
        B --> B1[Instance 1]
        B --> B2[Instance 2]
        B --> B3[Instance N...]
    end

    subgraph "Database Layer"
        B1 --> C[Connection Pool]
        B2 --> C
        B3 --> C
        C --> D[Postgres Primary]
        D -.->|Read Replicas<br/>Optional| E[Replica 1]
        D -.->|Read Replicas<br/>Optional| F[Replica 2]
    end

    subgraph "Caching Layer"
        G[find_similar_searches]
        H[Recent Results Cache]
    end

    B1 --> G
    B2 --> G
    B3 --> G
    G --> H
    H --> D

    subgraph "External APIs"
        I[OpenAI API]
        J[Rate Limiting<br/>Queue]
    end

    B1 --> J
    B2 --> J
    B3 --> J
    J --> I

    style B1 fill:#ffe1f5
    style B2 fill:#ffe1f5
    style B3 fill:#ffe1f5
    style D fill:#f5ffe1
    style H fill:#fff4e1
```

---

## Security Model

```mermaid
graph TB
    subgraph "Public Access"
        A[Anonymous User] -->|Anon Key| B[Edge Functions]
        C[Authenticated User] -->|JWT Token| B
    end

    B --> D{Request Type}

    D -->|Search| E[Service Role<br/>Access]
    D -->|View History| F{Check RLS}

    E --> G[search_businesses_by_vector]
    E --> H[log_search]

    F -->|Own History| I[Allow]
    F -->|Other's History| J[Deny]

    G --> K[(business_profiles<br/>Public Read)]
    H --> L[(search_history<br/>RLS Protected)]

    I --> L
    J --> M[Error: Unauthorized]

    subgraph "Secrets Management"
        N[OPENAI_API_KEY]
        O[Service Role Key]
    end

    E -.->|Uses| N
    E -.->|Uses| O

    style E fill:#ffe1f5
    style K fill:#e1f5ff
    style L fill:#f5ffe1
    style N fill:#fff4e1
    style O fill:#fff4e1
```

---

## Monitoring & Analytics Flow

```mermaid
flowchart TB
    A[Every Search] --> B{Search Type}

    B -->|Results| C[Log Full Details]
    B -->|Clarification| D[Log Clarification Flag]
    B -->|Error| E[Log Error Info]

    C --> F[search_history table]
    D --> F
    E --> F

    F --> G[Materialized View:<br/>search_analytics]

    G --> H[Daily Aggregations]
    H --> I[Total Searches]
    H --> J[Unique Users/Sessions]
    H --> K[Avg Response Time]
    H --> L[Zero-Result Rate]
    H --> M[Clarification Rate]

    F --> N[Real-time Queries]
    N --> O[Recent Searches]
    N --> P[Popular Queries]
    N --> Q[Failed Searches]

    I --> R[Dashboard/Alerts]
    J --> R
    K --> R
    L --> R
    M --> R

    O --> R
    P --> R
    Q --> R

    style F fill:#f5ffe1
    style G fill:#fff4e1
    style R fill:#e1f5ff
```

---

## Cost Optimization Strategy

```mermaid
graph TB
    A[Incoming Search] --> B{Check Cache}

    B -->|Cache Hit<br/>Similarity > 0.9| C[Return Cached Results]
    B -->|Cache Miss| D[Generate Embedding]

    C -.->|Save $0.0001| E[Cost Savings]

    D --> F{Need LLM<br/>Analysis?}

    F -->|Query Clear| G[Skip LLM<br/>Direct Search]
    F -->|Query Ambiguous| H[Use LLM]

    G -.->|Save $0.0005| E
    H --> I[GPT-4o-mini<br/>Cheapest Option]

    I --> J[Vector Search]
    G --> J

    J --> K{Batch<br/>Embeddings?}

    K -->|Yes| L[Process in Batches<br/>Rate Limit Friendly]
    K -->|No| M[Individual Calls]

    L -.->|Avoid Rate Limit Fees| E

    E --> N[Monitor Usage]
    N --> O{Cost > Budget?}
    O -->|Yes| P[Adjust Thresholds]
    O -->|No| Q[Continue]

    P --> A

    style C fill:#e1f5ff
    style G fill:#e1f5ff
    style L fill:#e1f5ff
    style E fill:#c8ffc8
```

---

## Deployment Pipeline

```mermaid
flowchart LR
    A[Local Development] --> B[Test Locally]
    B --> C{Tests Pass?}

    C -->|No| A
    C -->|Yes| D[Commit to Git]

    D --> E[Deploy Database<br/>Migrations]
    E --> F[supabase db push]

    F --> G{Migration<br/>Success?}
    G -->|No| H[Rollback]
    G -->|Yes| I[Deploy Edge<br/>Functions]

    H --> A

    I --> J[supabase functions<br/>deploy chat_search]
    J --> K[supabase functions<br/>deploy generate_embeddings]

    K --> L{Functions<br/>Deployed?}
    L -->|No| H
    L -->|Yes| M[Generate<br/>Embeddings]

    M --> N[Run Integration<br/>Tests]
    N --> O{Tests Pass?}

    O -->|No| H
    O -->|Yes| P[Update React<br/>Native App]

    P --> Q[Deploy to<br/>Production]
    Q --> R[Monitor Logs &<br/>Analytics]

    style F fill:#ffe1f5
    style J fill:#ffe1f5
    style K fill:#ffe1f5
    style Q fill:#e1f5ff
    style R fill:#fff4e1
```

---

## Migration Timeline

```mermaid
gantt
    title Migration from n8n to Edge Functions
    dateFormat  HH:mm
    axisFormat %H:%M

    section Preparation
    Review documentation           :done, prep1, 00:00, 30m
    Install dependencies           :done, prep2, after prep1, 30m

    section Database
    Link Supabase project         :active, db1, after prep2, 15m
    Run migrations                :db2, after db1, 30m
    Verify schema                 :db3, after db2, 15m

    section Edge Functions
    Configure OpenAI key          :ef1, after db3, 10m
    Deploy chat_search            :ef2, after ef1, 20m
    Deploy generate_embeddings    :ef3, after ef2, 20m
    Test with cURL                :ef4, after ef3, 30m

    section Data
    Generate embeddings (batch 1) :data1, after ef4, 60m
    Generate embeddings (batch 2) :data2, after data1, 60m
    Verify coverage               :data3, after data2, 15m

    section App Integration
    Add searchService.js          :app1, after data3, 30m
    Update SearchScreen.js        :app2, after app1, 60m
    Test on simulator             :app3, after app2, 30m
    Fix any issues                :app4, after app3, 30m

    section Testing & Launch
    Integration tests             :test1, after app4, 45m
    User acceptance testing       :test2, after test1, 60m
    Deploy to production          :launch, after test2, 30m
    Monitor initial usage         :monitor, after launch, 120m
```

**Total Estimated Time:** 10-12 hours (spread over 2-3 days)

---

These diagrams provide a visual understanding of the system architecture, data flows, and deployment process. They render automatically on GitHub for easy reference.
