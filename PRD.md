# **Struktur PRD PETORA INDONESIA**

PRD (*Product Requirements Document*) PETORA harus menjadi dokumen kontrak utama yang menjelaskan apa yang dibangun, bagaimana sistem bekerja, kebutuhan bisnis, perilaku pengguna, dan kriteria penerimaan setiap fitur.

Struktur dirancang untuk PETORA sebagai **platform manajemen klinik hewan dan pet shop dengan satu perusahaan, banyak cabang (Single Company, Multi-Branch)**, mencakup aplikasi operasional internal dan portal pemilik hewan.

## **1. Struktur dokumen PRD**

**PRD — PETORA INDONESIA**

Master Document

**01. Product Overview**

- 1.1 Latar belakang produk
- 1.2 Visi dan misi
- 1.3 Tujuan produk
- 1.4 Permasalahan yang diselesaikan
- 1.5 Target pengguna
- 1.6 Product value proposition
- 1.7 Ruang lingkup produk

**02. Business Requirements**

- 2.1 Model bisnis
- 2.2 Struktur perusahaan
- 2.3 Struktur cabang
- 2.4 Kebijakan operasional
- 2.5 Aturan transaksi
- 2.6 Aturan keuangan
- 2.7 Aturan inventaris
- 2.8 Aturan klinik hewan
- 2.9 Decision Register

**03. User & Access Management**

- 3.1 User personas
- 3.2 Daftar role
- 3.3 Hak akses dan permission
- 3.4 Role-based dashboard
- 3.5 Authentication
- 3.6 Session management
- 3.7 Branch access control

**04. Application Architecture**

- 4.1 Struktur aplikasi
- 4.2 Operational application
- 4.3 Pet owner portal
- 4.4 Navigasi aplikasi
- 4.5 Dashboard architecture
- 4.6 Shared components

**05. Functional Requirements**

- 5.1 Authentication & Authorization
- 5.2 Organization Management
- 5.3 Employee Management
- 5.4 Customer Management
- 5.5 Pet Management
- 5.6 Veterinary Clinic
- 5.7 Appointment & Queue
- 5.8 Examination & Medical Records
- 5.9 Pharmacy & Prescription
- 5.10 Hospitalization
- 5.11 Billing & Payment
- 5.12 Cashier & Shift
- 5.13 Pet Shop & POS
- 5.14 Inventory Management
- 5.15 Procurement
- 5.16 Supplier Management
- 5.17 Returns & Refunds
- 5.18 Financial Management
- 5.19 Reports & Analytics
- 5.20 System Configuration
- 5.21 Audit Log
- 5.22 Pet Owner Portal

**06. Workflow & Business Process**

- 6.1 Customer registration
- 6.2 Pet registration
- 6.3 Appointment workflow
- 6.4 Veterinary examination workflow
- 6.5 Prescription workflow
- 6.6 Hospitalization workflow
- 6.7 Checkout workflow
- 6.8 Payment workflow
- 6.9 Cashier shift workflow
- 6.10 Inventory workflow
- 6.11 Procurement workflow
- 6.12 Returns workflow

**07. Data Requirements**

- 7.1 Entity definitions
- 7.2 Database entities
- 7.3 Entity relationships
- 7.4 Data ownership
- 7.5 Branch data isolation
- 7.6 Data validation
- 7.7 Data retention
- 7.8 Data migration

**08. UI/UX Requirements**

- 8.1 Design principles
- 8.2 Design system
- 8.3 Color palette
- 8.4 Typography
- 8.5 Layout system
- 8.6 Responsive behavior
- 8.7 Navigation patterns
- 8.8 Form standards
- 8.9 Table standards
- 8.10 Loading, empty and error states
- 8.11 Accessibility

**09. Integration Requirements**

- 9.1 Frontend integration
- 9.2 Backend integration
- 9.3 Database integration
- 9.4 File storage
- 9.5 Internal API contracts
- 9.6 External service integration

**10. Non-Functional Requirements**

- 10.1 Security
- 10.2 Performance
- 10.3 Reliability
- 10.4 Scalability
- 10.5 Availability
- 10.6 Maintainability
- 10.7 Observability
- 10.8 Backup & recovery

**11. Testing & Acceptance Criteria**

- 11.1 Unit testing
- 11.2 Integration testing
- 11.3 API testing
- 11.4 Database testing
- 11.5 Authentication testing
- 11.6 RBAC testing
- 11.7 Branch isolation testing
- 11.8 E2E testing
- 11.9 User acceptance testing
- 11.10 Definition of Done

**12. Development & Delivery**

- 12.1 Development principles
- 12.2 Technology architecture
- 12.3 Repository structure
- 12.4 Development phases
- 12.5 Milestones
- 12.6 Dependencies
- 12.7 CI/CD requirements
- 12.8 Release requirements

**13. Product Governance**

- 13.1 PRD versioning
- 13.2 Requirement traceability
- 13.3 Change management
- 13.4 Decision Register
- 13.5 Conflict resolution
- 13.6 Approval history

## **2. Format standar setiap modul**

Setiap modul dalam Functional Requirements harus menggunakan format yang konsisten.

| Bagian                  | Isi                    |
| ----------------------- | ---------------------- |
| Module ID               | Identitas unik modul   |
| Module Name             | Nama modul             |
| Objective               | Tujuan modul           |
| Description             | Deskripsi fungsi       |
| Actors                  | Pengguna yang terlibat |
| Permissions             | Hak akses              |
| Functional Requirements | Persyaratan fungsional |
| Business Rules          | Aturan bisnis          |
| Workflow                | Alur proses            |
| Data Requirements       | Data yang dibutuhkan   |
| UI Requirements         | Kebutuhan antarmuka    |
| Validation              | Validasi input         |
| Error Handling          | Penanganan kesalahan   |
| Dependencies            | Ketergantungan modul   |
| Acceptance Criteria     | Kriteria penerimaan    |
| Test Scenarios          | Skenario pengujian     |

## **3. Standar penulisan requirement**

Setiap requirement harus mempunyai ID unik dan dapat diuji.

Contoh:

**FR-POS-001 — Membuat Transaksi Penjualan**

- Sistem harus memungkinkan kasir membuat transaksi penjualan.
- Sistem harus memvalidasi ketersediaan stok sebelum checkout.
- Sistem harus menolak transaksi apabila stok tidak mencukupi.
- Sistem harus mengaitkan transaksi dengan cabang dan shift kasir.
- Sistem harus mencatat seluruh item yang dijual.
- Sistem harus menyimpan transaksi secara konsisten ke database.

**Acceptance Criteria:**

1. Kasir dapat menambahkan produk ke keranjang.
2. Sistem menghitung subtotal dan total transaksi dengan benar.
3. Stok diperiksa sebelum transaksi diselesaikan.
4. Transaksi tercatat pada cabang yang benar.
5. Transaksi tercatat pada shift kasir yang benar.
6. Perubahan stok dan pencatatan transaksi konsisten.

## **4. Dokumen pendukung PRD**

Agar tidak membuat dokumentasi berlebihan, cukup gunakan dokumen pendukung berikut.

| Dokumen                  | Fungsi                            |
| ------------------------ | --------------------------------- |
| `PRD.md`                 | Kontrak kebutuhan produk          |
| `DECISIONS.md`           | Keputusan bisnis dan teknis Owner |
| `MODULES.md`             | Daftar modul dan dependensinya    |
| `WORKFLOWS.md`           | Alur operasional                  |
| `PERMISSIONS.md`         | Role dan hak akses                |
| `DATA-DICTIONARY.md`     | Definisi data dan entitas         |
| `ACCEPTANCE-CRITERIA.md` | Kriteria penerimaan produk        |

## **5. Hubungan PRD dengan pengembangan**

\#chatgpt-mermaid-\_r_5pb\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(13, 13, 13);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_5pb\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_5pb\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_5pb\_ .error-icon{fill:rgb(243, 243, 243);}#chatgpt-mermaid-\_r_5pb\_ .error-text{fill:rgb(13, 13, 13);stroke:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_5pb\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_5pb\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_5pb\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_5pb\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_5pb\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_5pb\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_5pb\_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_5pb\_ .marker.cross{stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_5pb\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_5pb\_ p{margin:0;}#chatgpt-mermaid-\_r_5pb\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_5pb\_ .cluster-label text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_5pb\_ .cluster-label span{color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_5pb\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_5pb\_ .label text,#chatgpt-mermaid-\_r_5pb\_ span{fill:rgb(13, 13, 13);color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_5pb\_ .node rect,#chatgpt-mermaid-\_r_5pb\_ .node circle,#chatgpt-mermaid-\_r_5pb\_ .node ellipse,#chatgpt-mermaid-\_r_5pb\_ .node polygon,#chatgpt-mermaid-\_r_5pb\_ .node path{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);stroke-width:1px;}#chatgpt-mermaid-\_r_5pb\_ .rough-node .label text,#chatgpt-mermaid-\_r_5pb\_ .node .label text,#chatgpt-mermaid-\_r_5pb\_ .image-shape .label,#chatgpt-mermaid-\_r_5pb\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_5pb\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_5pb\_ .rough-node .label,#chatgpt-mermaid-\_r_5pb\_ .node .label,#chatgpt-mermaid-\_r_5pb\_ .image-shape .label,#chatgpt-mermaid-\_r_5pb\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_5pb\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_5pb\_ .root .anchor path{fill:rgb(143, 143, 143)!important;stroke-width:0;stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_5pb\_ .arrowheadPath{fill:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_5pb\_ .edgePath .path{stroke:rgb(143, 143, 143);stroke-width:1px;}#chatgpt-mermaid-\_r_5pb\_ .flowchart-link{stroke:rgb(143, 143, 143);fill:none;}#chatgpt-mermaid-\_r_5pb\_ .edgeLabel{background-color:rgb(252, 252, 252);text-align:center;}#chatgpt-mermaid-\_r_5pb\_ .edgeLabel p{background-color:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_5pb\_ .edgeLabel rect{opacity:0.5;background-color:rgb(252, 252, 252);fill:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_5pb\_ .labelBkg{background-color:rgba(252, 252, 252, 0.5);}#chatgpt-mermaid-\_r_5pb\_ .cluster rect{fill:rgb(243, 243, 243);stroke:rgba(0, 0, 0, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_5pb\_ .cluster text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_5pb\_ .cluster span{color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_5pb\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(243, 243, 243);border:1px solid rgba(0, 0, 0, 0.1);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_5pb\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_5pb\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_5pb\_ .icon-shape,#chatgpt-mermaid-\_r_5pb\_ .image-shape{background-color:rgb(252, 252, 252);text-align:center;}#chatgpt-mermaid-\_r_5pb\_ .icon-shape p,#chatgpt-mermaid-\_r_5pb\_ .image-shape p{background-color:rgb(252, 252, 252);padding:2px;}#chatgpt-mermaid-\_r_5pb\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_5pb\_ .image-shape .label rect{opacity:0.5;background-color:rgb(252, 252, 252);fill:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_5pb\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_5pb\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_5pb\_ .node .neo-node{stroke:rgb(83, 154, 248);}#chatgpt-mermaid-\_r_5pb\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_5pb\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_5pb\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_5pb\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_5pb\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_5pb\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_5pb\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_5pb\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_5pb\_ [data-look="neo"].node .neo-line path{stroke:rgb(83, 154, 248);filter:none;}#chatgpt-mermaid-\_r_5pb\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_5pb\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_5pb\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_5pb\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_5pb\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_5pb\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_5pb\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_5pb\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(0, 79, 153);}#chatgpt-mermaid-\_r_5pb\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(0, 79, 153);}#chatgpt-mermaid-\_r_5pb\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_5pb\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_5pb\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(245, 250, 255);stroke:rgb(206, 219, 229);stroke-width:1px;}#chatgpt-mermaid-\_r_5pb\_ .node rect,#chatgpt-mermaid-\_r_5pb\_ .node circle,#chatgpt-mermaid-\_r_5pb\_ .node ellipse,#chatgpt-mermaid-\_r_5pb\_ .node polygon,#chatgpt-mermaid-\_r_5pb\_ .node path{fill:rgb(229, 243, 255);stroke:rgba(0, 0, 0, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_5pb\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_5pb\_ .mermaid-decision .label-container{fill:rgb(245, 250, 255);stroke:rgb(206, 219, 229);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_5pb\_ .edgePaths .flowchart-link{stroke:rgb(143, 143, 143);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_5pb\_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_5pb\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}PRD — Product RequirementsBusiness Rules & DecisionsModule SpecificationsTechnical ArchitectureDatabase & APIFrontend ImplementationIntegration TestingE2E & Acceptance TestingAcceptance Passed?Fix & RetestVerified ReleaseNoYes

**Prinsip utama:** PRD menentukan apa dan bagaimana PETORA harus berperilaku. Dokumen arsitektur menentukan bagaimana kebutuhan tersebut diimplementasikan. Pengujian membuktikan bahwa implementasi benar-benar memenuhi PRD.

## **6. Keputusan dasar PETORA yang harus dipertahankan**



- Single Company, Multi-Branch.
- Web-first application.
- Operational application dan Pet Owner Portal.
- Login username dan PIN 6 digit.
- Role-based access control dengan default-deny.
- Setiap kasir mempunyai shift sendiri.
- Pengelolaan cabang dengan isolasi data.
- Frontend menggunakan Vercel.
- Backend dan database menggunakan Supabase.
- Desain Clinical, Light Theme, Gradual Migration.

Keputusan bisnis yang sudah disetujui juga harus dipertahankan dalam Decision Register, bukan ditafsirkan ulang ketika implementasi.

