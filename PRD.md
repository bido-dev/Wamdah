Product Requirements Document: Wamdah (ومضة)
1. Document Overview
•	Product Name: Wamdah (ومضة)
•	Platform: Web Application (Responsive Desktop & Mobile)
•	Primary Tech Stack: Next.js (Frontend/API), Vercel (Hosting), Supabase (PostgreSQL Database, Object Storage, Real-time subscriptions)
2. Product Overview
2.1 Problem Statement
During classroom sessions, transferring presentation materials to the main classroom computer or distributing lecture files to students is highly disruptive. It requires manual logins to cloud drives on public computers or the use of physical flash drives, consuming valuable instructional time and creating security vulnerabilities.
2.2 Solution
Wamdah is a frictionless, web-based file-sharing utility designed specifically for the classroom. It utilizes temporary 6-digit PINs and QR codes to bridge devices instantly, allowing students and teachers to push and pull files without creating accounts or logging into third-party services.
3. Technical Architecture & Constraints
To bypass Vercel’s serverless payload limits (4.5MB on free tier) and ensure high-speed delivery, the system will utilize Direct-to-Storage Uploads.
•	Database: Supabase PostgreSQL will store active session data (the 6-digit codes mapped to file metadata).
•	Storage: Supabase Storage will house the actual files. Clients will use the Supabase JS client or presigned URLs to upload directly to the storage bucket, completely bypassing Vercel API routes for the file binary.
•	Real-time Updates: Supabase Realtime will be used to listen for database inserts. When a student uploads a file on their phone, the classroom PC will instantly detect the database change and update the UI without requiring a page refresh.
4. Core Functional Requirements
4.1 Feature: Receive Materials
Enables a device (usually the classroom PC) to act as a receiver for incoming files.
•	Trigger: User clicks "Receive Materials".
•	System Action: Generates a cryptographically secure, random 6-digit code and a corresponding QR code. A new record is created in the Supabase Sessions table.
•	State: The UI enters a "listening" state via Supabase Realtime, waiting for a file to be attached to that specific session ID.
•	Resolution: Once the file is uploaded by the sender, the UI updates instantly, providing a secure download link.
4.2 Feature: Send Materials
Enables a device (usually a student's smartphone) to push a file to a receiving device.
•	Entry Points:
o	Manual: User clicks "Send Materials", enters the 6-digit code, and selects a file.
o	Camera/QR: User scans the receiver's QR code using their native phone camera. The QR code contains a deep link (e.g., [wamdah.com/send?code=123456](https://wamdah.com/send?code=123456)) that directly opens the browser to the upload screen.
•	Upload Mechanism: The file is uploaded directly to Supabase Storage. Upon success, the Supabase Sessions table is updated with the file URL, triggering the receiver's real-time listener.
4.3 Feature: Group Sharing (1-to-Many)
Enables a teacher to distribute a single file to multiple students simultaneously.
•	Trigger: User clicks "Group Sharing" and uploads a file to Supabase.
•	System Action: Generates a 6-digit code and QR code tied to the uploaded file.
•	Distribution: Multiple students can scan the QR code or enter the PIN to retrieve the download link.
•	Concurrency: The system must support simultaneous read requests from an entire classroom without degrading performance.
5. Non-Functional & UI/UX Requirements
5.1 UI/UX Specifications
•	Localization: Full i18n support for Arabic (RTL) and English (LTR). The UI must flip seamlessly without requiring a hard page reload (managed via Next.js routing/context).
•	Theming: Dark Mode / Light Mode toggle, defaulting to the user's system preferences using CSS media queries (prefers-color-scheme).
•	Simplicity: The landing page must feature three massive, unmistakable call-to-action buttons for the core features to minimize cognitive load.
5.2 Security & Data Lifecycle
•	File Expiration (TTL): Files and their corresponding 6-digit codes must be ephemeral. A Supabase pg_cron job or Edge Function should run periodically to delete database records and purge Supabase Storage files that are older than a set timeframe (e.g., 2 hours).
•	Rate Limiting: Implement basic rate limiting on the Next.js API routes that generate 6-digit codes to prevent brute-force exhaustion of the code space.
•	Anonymous Access: No user authentication (OAuth/Passwords) is required for core flows, enforcing zero-friction usability.
6. Proposed Database Schema (Supabase PostgreSQL)
To support the above features, a single core table can manage the state.
Column	Type	Description
id	UUID	Primary key
pin_code	String (6)	The 6-digit code used for pairing
session_type	Enum	RECEIVE (1-to-1) or GROUP (1-to-many)
file_url	String	Path to the file in Supabase Storage (nullable initially for 'Receive' mode)
file_name	String	Original name of the uploaded file
created_at	Timestamp	Used for calculating expiration
7. Out of Scope (For v1.0)
•	User accounts and historical logs of shared files.
•	Persistent file storage (files are strictly temporary).
•	In-browser preview of files (documents must be downloaded to be viewed).

