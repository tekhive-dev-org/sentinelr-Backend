### *Sentinelr Application* Is A :  

**Security-Oriented Tool With Features Like :**  

* Parental control  

* Filtering content (web access control)  

* Tracking devices (GPS)  

* Monitoring activity  


---

**Some Implementated Enterprise-Grade Security  :**

- [ACID Transactions (atomicity, consistency, isolation, durability)]() 

- [CHECK constraints for DB-Level Protection (e.g: password_required_for_non_child)]()  

- [Middlewares]()

- [Tokens: Auth-tokens, Device-tokens, JWT]()

- [2 Factor Authentication]()

- [Roles & Permissions]()

- [Race Condition Locks & Asynchrony (eg: ```await PairingCode.function({ ... }, ..., lock: transaction.LOCK.UPDATE``` }))]()

- [Model-Level Hooks And Flags (e.g: beforeCreate_&_beforeUpdate_hooks, isLoginEnabled_flag)]()

---

**Functionalies**
- To make the system scalable and faster, instead of backend requesting location in real time, an inbuilt mobile-agent sends this periodically  

- Instead of polling (frontend waiting for backend for realtime updates), backend pushes update to dashboard via webSockets

---

* generate migrations locally like so ```npx sequelize-cli migration:generate --name migration-message```