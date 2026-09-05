# Security Specification: Dikjyoti Online Test

## 1. Data Invariants
- `users/{userId}`: A user document can only be created by the authenticated owner (`request.auth.uid == userId`).
- Identity Integrity: The `uid` in the document must match `request.auth.uid`.
- Self-Assigned Role Safeguards: Students can create their profile as role `student`. Role escalation or changes to `role` or `isBlocked` are prohibited for non-teachers/admins.
- Immutability: The `createdAt` and `uid` fields cannot be altered once created.

## 2. Dirty Dozen Payloads Handled
1. Creating profile with mismatched `uid` (spoofing another user ID) -> REJECTED.
2. Unauthenticated reads or writes -> REJECTED.
3. Updating another user's profile -> REJECTED.
4. Overwriting `role` from student to teacher after account creation -> REJECTED.
5. Setting `isBlocked` to false by a blocked user -> REJECTED.
6. Injecting unbounded strings into `displayName` (> 100 chars) -> REJECTED.
7. Injecting non-string types for email or role -> REJECTED.
8. Writing documents with unknown or malicious script payloads -> REJECTED.
9. Modifying immutable `createdAt` timestamp -> REJECTED.
10. Anonymous user writes -> REJECTED.
11. Path traversal or invalid document IDs -> REJECTED.
12. Bulk querying private PII of other students without authorization -> REJECTED.
