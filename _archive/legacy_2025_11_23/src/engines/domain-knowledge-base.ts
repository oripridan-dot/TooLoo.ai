/**
 * Domain Knowledge Base for TooLoo.ai
 * Provides industry-standard fundamentals across CS domains
 * Enables TooLoo.ai to respond with actual depth, not generic AI chat
 */

const domainKnowledge = {
  'Data Structures & Algorithms': {
    fundamentals: [
      'Time complexity analysis (Big O: O(1), O(log n), O(n), O(n²), O(2^n))',
      'Space complexity and trade-offs',
      'Array operations: indexing O(1), insertion/deletion O(n)',
      'Linked Lists: insertion/deletion O(1) at known position, traversal O(n)',
      'Hash Tables: average O(1) lookup, O(n) worst case (collisions), 0.7 load factor',
      'Binary Search Trees: balanced O(log n), unbalanced O(n)',
      'Heaps: O(log n) insert/remove, O(1) peek, used for priority queues',
      'Graphs: adjacency list O(V+E), adjacency matrix O(V²)',
      'Sorting: QuickSort O(n log n) avg, MergeSort O(n log n) guaranteed, HeapSort O(n log n)',
      'Dynamic Programming: memoization for overlapping subproblems (Fibonacci, Knapsack)',
      'Greedy algorithms: local optimal choices (Activity Selection, Huffman Coding)',
      'Graph algorithms: DFS/BFS O(V+E), Dijkstra O((V+E)log V), Floyd-Warshall O(V³)'
    ],
    keyPoints: [
      'Choose data structure based on primary operations needed',
      'Trade-off between time and space complexity always exists',
      'Consider actual data size: O(n²) acceptable for small n',
      'String algorithms: KMP O(n+m), Rabin-Karp for pattern matching'
    ],
    industryStandards: [
      'Code interviews often test: Arrays, Strings, Trees, Graphs, DP',
      'LeetCode patterns: Two pointers, Sliding window, Binary search, DFS/BFS, DP',
      'Production code rarely needs custom implementations (use stdlib)',
      'Focus: understanding, trade-offs, optimization for actual constraints'
    ]
  },
  'Operating Systems': {
    fundamentals: [
      'Process vs Thread: process isolated memory, thread shared memory (lighter)',
      'Context switching: saving/restoring process state, expensive operation',
      'Process states: New → Ready → Running → Waiting → Terminated',
      'CPU Scheduling: FCFS, Round Robin, Priority, Multi-level Queue',
      'Synchronization: locks, semaphores, monitors, condition variables',
      'Deadlock: necessary conditions (mutual exclusion, hold-and-wait, no preemption, circular wait)',
      'Memory Management: paging, segmentation, virtual memory, TLB',
      'Page Replacement: FIFO, LRU, Optimal (not implementable)',
      'File Systems: inode structure, directory traversal, FAT vs inode tables',
      'I/O Management: buffering, caching, DMA (Direct Memory Access)',
      'Booting: BIOS → Bootloader → Kernel → Shell',
      'Inter-process Communication: pipes, sockets, message queues, shared memory'
    ],
    keyPoints: [
      'OS abstracts hardware, provides resource management, enforces security',
      'Throughput vs latency trade-off in scheduling',
      'Page size affects cache and memory efficiency: 4KB typical',
      'Working set concept: set of pages actively used by process'
    ],
    industryStandards: [
      'Linux kernel: monolithic, modular design, 30M+ lines of code',
      'Windows: hybrid (kernel-mode, user-mode separation)',
      'Modern OSes: preemptive multitasking, virtual memory, memory protection',
      'System calls: only way user programs access kernel services'
    ]
  },
  'Computer Networks': {
    fundamentals: [
      'OSI Model: Physical → Data Link → Network → Transport → Session → Presentation → Application',
      'TCP/IP Stack: Link Layer → Internet → Transport → Application',
      'IP: connectionless, unreliable, best-effort delivery, addressing scheme',
      'TCP: connection-oriented, reliable, ordered delivery, flow control, congestion control',
      'UDP: connectionless, unreliable, low latency, no flow control',
      'DNS: hierarchical, recursive resolution, caching at multiple levels',
      'HTTP/HTTPS: request-response, stateless (cookies for state), headers, status codes',
      'Routing: path selection, RIP, OSPF, BGP algorithms',
      'Switching: packet switching vs circuit switching',
      'Congestion Control: TCP Tahoe/Reno, AIMD (Additive Increase Multiplicative Decrease)',
      'Network Address Translation (NAT): mapping private to public IPs',
      'Quality of Service (QoS): packet prioritization, bandwidth reservation'
    ],
    keyPoints: [
      'Latency = propagation delay + transmission delay + processing delay + queueing delay',
      'Bandwidth: link capacity, throughput: actual data rate (≤ bandwidth)',
      'TCP three-way handshake: SYN, SYN-ACK, ACK',
      'Packet loss causes retransmissions, increases latency'
    ],
    industryStandards: [
      'IPv4: 32-bit, IPv6: 128-bit addressing (adoption ongoing)',
      'HTTP/2: multiplexing, server push; HTTP/3: QUIC protocol',
      'HTTPS: TLS 1.3 standard, certificate validation required',
      'DNS over HTTPS (DoH) for privacy, DNSSEC for authentication'
    ]
  },
  'Databases': {
    fundamentals: [
      'ACID: Atomicity (all-or-nothing), Consistency (valid state), Isolation (concurrent), Durability (persistent)',
      'SQL: DDL (CREATE, ALTER, DROP), DML (SELECT, INSERT, UPDATE, DELETE), DCL (GRANT, REVOKE)',
      'Indexing: B-tree O(log N), hash O(1) average, helps SELECT/WHERE, slows INSERT/UPDATE/DELETE',
      'Query Optimization: query planner, index selection, join order, statistics',
      'Normalization: 1NF, 2NF, 3NF, BCNF to eliminate redundancy and anomalies',
      'Transactions: COMMIT, ROLLBACK, savepoints',
      'Locking: read locks (shared), write locks (exclusive), deadlock prevention',
      'NoSQL types: Key-value (Redis), Document (MongoDB), Column (Cassandra), Graph (Neo4j)',
      'CAP Theorem: Consistency vs Availability vs Partition tolerance (choose 2)',
      'Replication: master-slave, multi-master, eventual consistency',
      'Sharding: horizontal partitioning by key range or hash',
      'Backup strategies: full, incremental, differential, point-in-time recovery'
    ],
    keyPoints: [
      'SQL joins: INNER, LEFT, RIGHT, FULL, CROSS - understand execution order',
      'GROUP BY aggregation, HAVING clause for filtered groups',
      'Explain/Analyze: reveals actual query execution plan, index usage',
      'Slow query log: identifies performance bottlenecks'
    ],
    industryStandards: [
      'PostgreSQL: reliability, ACID compliance, advanced features',
      'MySQL/MariaDB: web applications, InnoDB (ACID), MyISAM (fast, no ACID)',
      'MongoDB: schema flexibility, horizontal scaling, eventual consistency',
      'Redis: in-memory, caching, sessions, pub/sub, 5-10μs latency',
      'Connection pooling: reuse connections, reduce overhead'
    ]
  },
  'Computer Architecture': {
    fundamentals: [
      'CPU: control unit, ALU, registers, cache hierarchy (L1 < L2 < L3, exponential cost)',
      'Instruction cycles: Fetch → Decode → Execute → Memory → Write Back',
      'Cache levels: L1 (fastest, 32KB), L2 (256KB), L3 (8MB), Main memory (GBs)',
      'Cache coherence: MESI protocol ensures consistency across cores',
      'Pipelining: overlapping stages, hazards (data, control, structural)',
      'Superscalar: multiple instruction execution per cycle',
      'Branch prediction: speculative execution, incorrect predictions cause flushes',
      'Virtual memory: translation lookaside buffer (TLB), page tables, address translation',
      'Memory hierarchy: registers → L1/L2/L3 → RAM → SSD → HDD',
      'Endianness: big-endian (network byte order), little-endian (x86)',
      'Interrupts and exceptions: handling, priority levels, context switching',
      'Floating point: IEEE 754, precision loss, rounding errors'
    ],
    keyPoints: [
      'Cache line: 64 bytes typical, spatial locality matters',
      'False sharing: different threads touching same cache line',
      'Memory barriers: synchronization for concurrent access',
      'NUMA (Non-Uniform Memory Access): local vs remote memory latency'
    ],
    industryStandards: [
      'Modern CPUs: out-of-order execution, speculative execution',
      'GPU computing: massive parallelism (thousands of threads)',
      'ARM vs x86: instruction set architectures with trade-offs',
      'Branch prediction: Intel 97% accuracy, reduces misprediction penalties'
    ]
  },
  'Machine Learning': {
    fundamentals: [
      'Supervised learning: labeled data, regression (continuous), classification (discrete)',
      'Unsupervised learning: unlabeled data, clustering (k-means), dimensionality reduction (PCA)',
      'Reinforcement learning: agents, actions, rewards, Q-learning, policy gradient',
      'Loss functions: regression (MSE), classification (cross-entropy), custom losses',
      'Optimization: gradient descent, SGD, momentum, Adam, learning rate scheduling',
      'Overfitting: model memorizes noise, detected by validation set divergence',
      'Regularization: L1/L2 (Lasso/Ridge), dropout, early stopping, data augmentation',
      'Cross-validation: k-fold ensures generalization, prevents data leakage',
      'Feature engineering: selection (correlation, mutual information), scaling, encoding',
      'Neural Networks: layers, activation functions (ReLU, sigmoid, tanh), backpropagation',
      'Convolutional Networks (CNN): convolution, pooling, translation invariance',
      'Recurrent Networks (RNN/LSTM): sequence modeling, vanishing gradients'
    ],
    keyPoints: [
      'Train/validation/test split: prevent data leakage (shuffle, stratify for classification)',
      'Metrics: accuracy (imbalanced), precision/recall/F1, AUC-ROC, confusion matrix',
      'Hyperparameter tuning: grid search vs random search vs Bayesian optimization',
      'Batch normalization: stabilizes training, allows higher learning rates'
    ],
    industryStandards: [
      'PyTorch/TensorFlow: dominant frameworks, autograd for gradients',
      'Transformers: attention mechanism, BERT, GPT, revolutionized NLP',
      'Ensemble methods: random forests, gradient boosting (XGBoost, LightGBM)',
      'Model serving: quantization, pruning, distillation for production efficiency'
    ]
  },
  'Security': {
    fundamentals: [
      'Confidentiality: encryption prevents unauthorized access (AES-256, ChaCha20)',
      'Integrity: checksums, digital signatures, MACs prevent tampering',
      'Authentication: passwords (salted hashing: bcrypt, Argon2), MFA, certificates',
      'Authorization: role-based access control (RBAC), attribute-based (ABAC)',
      'Cryptography: symmetric (speed, shared key), asymmetric (public/private), hybrid',
      'Hash functions: one-way, deterministic, collision-resistant (SHA-256, SHA-3)',
      'Digital signatures: sign with private key, verify with public key',
      'SSL/TLS: handshake, cipher suites, certificate validation, key exchange',
      'OWASP Top 10: injection, broken auth, XSS, CSRF, XXE, broken access control',
      'SQL injection: parameterized queries prevent exploitation',
      'XSS (Cross-Site Scripting): input validation, output encoding, CSP headers',
      'CSRF (Cross-Site Request Forgery): tokens, SameSite cookies'
    ],
    keyPoints: [
      'Defense in depth: multiple layers, assume breach at each level',
      'Principle of least privilege: minimize permissions granted',
      'Security is not obscurity: algorithms public, key management critical',
      'Timing attacks: use constant-time comparisons for sensitive data'
    ],
    industryStandards: [
      'PKI (Public Key Infrastructure): CAs, certificates, revocation lists',
      'OAuth 2.0/OpenID Connect: delegation, federated identity, tokens',
      'JWT (JSON Web Tokens): stateless, signed, typically 15min expiry',
      'HIPAA/GDPR/PCI-DSS: compliance requirements, data protection laws',
      'Penetration testing: simulates attacks, vulnerability assessment required'
    ]
  },
  'Distributed Systems': {
    fundamentals: [
      'Consensus: Byzantine Fault Tolerance, Raft, Paxos guarantee agreement',
      'CAP Theorem: choose 2 of Consistency, Availability, Partition tolerance',
      'Eventual Consistency: eventually agree, temporary divergence allowed',
      'Clock Synchronization: NTP, logical clocks (Lamport, vector clocks)',
      'Message Ordering: FIFO (point-to-point), causal (happens-before), total order',
      'Replication strategies: primary-backup, multi-master, quorum reads/writes',
      'Load Balancing: round-robin, least connections, IP hash, health checks',
      'Fault Tolerance: heartbeats, timeouts, failure detection, recovery',
      'Scalability: horizontal (add servers), vertical (bigger server), sharding',
      'Monitoring: metrics, logs, distributed tracing, alerting',
      'Service discovery: Consul, etcd, Eureka for dynamic registration',
      'Circuit breaker pattern: fail fast, fallback, half-open state'
    ],
    keyPoints: [
      'Network partition: nodes isolated, timeout-based detection',
      'Quorum: majority vote guarantees consistency (N/2 + 1)',
      'Idempotency: handle duplicate requests safely',
      'At-least-once delivery: can have duplicates, design for idempotency'
    ],
    industryStandards: [
      'Kubernetes: container orchestration, auto-scaling, self-healing',
      'Kafka: distributed message queue, publish-subscribe, partitions',
      'Cassandra: NoSQL, eventual consistency, wide column store',
      'gRPC: RPC framework, Protocol Buffers, HTTP/2',
      'Observability: Prometheus (metrics), ELK (logs), Jaeger (traces)'
    ]
  },
  'Software Engineering': {
    fundamentals: [
      'SOLID: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion',
      'Design Patterns: Singleton, Factory, Observer, Strategy, Decorator, Adapter, Proxy',
      'Architectural patterns: MVC, MVVM, Layered, Microservices, Event-driven',
      'Code quality: cyclomatic complexity, code coverage, duplication detection',
      'Testing: unit (isolated), integration (components), e2e (user flows), property-based',
      'Version Control: branching strategies (GitFlow, trunk-based), merge conflicts',
      'CI/CD: automated build, test, deploy, reduces manual errors',
      'Monitoring: observability, alerting, on-call rotations, blameless postmortems',
      'Documentation: code comments (why, not what), README, architecture decisions',
      'Technical debt: shortcuts now, cost later, measure and prioritize',
      'Performance optimization: profiling first (find bottlenecks), then optimize',
      'Debugging: reproducible steps, root cause analysis, fix vs symptom'
    ],
    keyPoints: [
      'DRY (Don\'t Repeat Yourself): extract common patterns',
      'KISS (Keep It Simple): simple code easier to maintain, test, understand',
      'Premature optimization: is root of evil, measure before optimizing',
      'Code review: knowledge sharing, catching bugs, knowledge transfer'
    ],
    industryStandards: [
      'Agile: sprints, velocity, backlog refinement, retrospectives',
      'Scrum: roles (PO, SM, team), ceremonies, iterative delivery',
      'Twelve-Factor App: stateless, configuration, logs, processes',
      'DevOps: shared responsibility, infrastructure as code, automation'
    ]
  }
};

class DomainKnowledgeBase {
  /**
   * Get knowledge context for a domain
   */
  getDomainsForQuery(query) {
    const queryLower = query.toLowerCase();
    const matches = [];
    
    for (const [domain, knowledge] of Object.entries(domainKnowledge)) {
      const keywords = domain.toLowerCase().split('&').map(d => d.trim());
      if (keywords.some(kw => queryLower.includes(kw))) {
        matches.push({ domain, knowledge });
      }
    }
    
    return matches;
  }

  /**
   * Enhance a query with domain knowledge context
   */
  enrichQueryWithKnowledge(query) {
    const relevantDomains = this.getDomainsForQuery(query);
    
    if (relevantDomains.length === 0) {
      return query;
    }

    let enhancedContext = `\n\n[DOMAIN KNOWLEDGE CONTEXT - Reference these fundamentals in your answer]:\n`;
    
    for (const { domain, knowledge } of relevantDomains) {
      enhancedContext += `\n### ${domain}\n`;
      enhancedContext += `**Fundamentals:**\n`;
      knowledge.fundamentals.slice(0, 5).forEach(f => {
        enhancedContext += `- ${f}\n`;
      });
      
      if (knowledge.keyPoints && knowledge.keyPoints.length > 0) {
        enhancedContext += `\n**Key Points:**\n`;
        knowledge.keyPoints.slice(0, 3).forEach(kp => {
          enhancedContext += `- ${kp}\n`;
        });
      }
      
      if (knowledge.industryStandards && knowledge.industryStandards.length > 0) {
        enhancedContext += `\n**Industry Standards:**\n`;
        knowledge.industryStandards.slice(0, 3).forEach(st => {
          enhancedContext += `- ${st}\n`;
        });
      }
    }

    enhancedContext += `\nINSTRUCTIONS: Use the above domain knowledge to ground your answer in industry standards and fundamentals. Be specific and technical.`;
    
    return query + enhancedContext;
  }

  /**
   * Get list of all available domains
   */
  getAllDomains() {
    return Object.keys(domainKnowledge);
  }

  /**
   * Get full knowledge for a specific domain
   */
  getFullDomainKnowledge(domain) {
    return domainKnowledge[domain] || null;
  }
}

export default new DomainKnowledgeBase();
