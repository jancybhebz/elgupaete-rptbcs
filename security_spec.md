# Security Specifications (Zero-Trust Attribute-Based Access Control)

This document maps out the data invariants, security validation constraints, and adversarial test matrices ("The Dirty Dozen") protecting the RPT Municipality real property tax application's Firestore backend.

## 1. Data Invariants

*   **Users Integrity**: Only authenticated staff can read or write user registration blocks. Users cannot elevate their own roles.
*   **Taxpayer Ownership**: Taxpayer registration entries must contain non-empty attributes (first name, last name, code) and are only writeable by authenticated, verified municipal personnel.
*   **Property Invariant**: Real Property Units (Properties) require correct formatting of the Parcel PIN check, TDN assignment, matching owners, and must be validated chronologically via the server-level timestamp.
*   **Statement of Account (SoaRecord)**: SOA records represent legal monetary assessments. Once issued, their total due balance and status values are locked unless handled via designated cashier settling transactions.
*   **Payments & Receipts**: To prevent money laundering or double-entry faults, a Payment action must create an immutable Payment ledger entry. An Official Receipt (OR) document cannot be fabricated with arbitrary payment values or missing verification logs.

---

## 2. The "Dirty Dozen" (Malicious / Unauthorized Payloads)

Here are twelve specific JSON payloads representing illegal queries or malicious mutations that the FireStore ruleset must reject with `PERMISSION_DENIED`:

### Payload 1: Admin Privilege Escalation (Identity Hack)
An attacker attempts to self-provision or self-elevate their profile record to `role: 'admin'`.
```json
{
  "id": 105,
  "username": "attacker",
  "name": "Malicious Actor",
  "email": "attacker@spam.com",
  "role": "admin",
  "office": "treasury",
  "status": "active"
}
```

### Payload 2: Spoofed Email Audit Bypass (Unverified Admin)
An attacker with a non-verified email account attempts to mutate system settings.
*Auth state has `email_verified: false`.*

### Payload 3: Shadow-Field Property Poisoning (Denial of Wallet)
An attacker tries to insert undocumented larger array structures or massive payload content strings to exhaust memory limit quotas.
```json
{
  "id": 999,
  "pin": "2026-PAETE-001",
  "tdn": "TDN-9999",
  "ownerId": 1,
  "ownerName": "Malicious Appender",
  "kind": "land",
  "classification": "residential",
  "barangayName": "Paete Central",
  "area": 100,
  "unit": "sqm",
  "status": "active",
  "garbageList": ["junk", "bloat", "unbounded_array_growth_exploit_here_repeat_x1000"]
}
```

### Payload 4: Orphaned SOA Generation (Relational Sync Violation)
An attacker attempts to create a Statement of Account linked to a non-existent property document.
```json
{
  "id": 1001,
  "soaNumber": "SOA-ILLEGAL-99",
  "taxpayerId": 12,
  "propertyId": 999999, // non-existent
  "billingYear": 2026,
  "billingPeriod": "annual",
  "totalDue": 10000.0,
  "status": "issued"
}
```

### Payload 5: Zero-Value Payment Fabrication (Integrity Theft)
An attacker tries to insert a custom payment claiming fully posted clearing with a zero or negative amount value.
```json
{
  "id": 2002,
  "paymentRef": "PAY-STOLEN",
  "soaNumber": "SOA-123",
  "taxpayerId": 45,
  "amountPaid": -500.0,
  "paymentChannel": "Cash",
  "status": "posted"
}
```

### Payload 6: Missing Verification Code Forgery (Audit Validation Trap)
An attacker tries to release a Statement of Account containing zero validation code hashes or server checks.
```json
{
  "id": 1003,
  "soaNumber": "SOA-NO-HASH",
  "taxpayerId": 1,
  "propertyId": 1,
  "billingYear": 2026,
  "billingPeriod": "annual",
  "totalDue": 500,
  "status": "issued",
  "verificationCode": ""
}
```

### Payload 7: Terminal State Override (Process Shortcut)
An attacker attempts to override a fully-posted ledger payment back to "pending" to retry credit discount cycles.
```json
// Existing status is "posted", incoming payload forces:
{
  "status": "pending"
}
```

### Payload 8: Immutable CreatedAt Timestamp Poisoning
An attacker tries to overwrite a historic document's original timestamp or set it in the future through client SDK parameters rather than using the server-asserted `request.time`.
```json
{
  "createdAt": "2030-01-01T00:00:00.000Z"
}
```

### Payload 9: PII Address Scraping (Blanket Read Scan)
An unauthenticated user or verified user with no specialized clearances attempts a blanket collection query matching random taxpayers to harvest emails, TINs, and physical addresses.
*Fails because `allow list` strictly validates relational ownership or enforces verified staff identity controls.*

### Payload 10: PIN Identifier Format Injection (Format Poisoning)
An attacker tries to register a property ID containing invalid special characters or shell arguments (e.g. `../../etc/passwd` or `$exec`).
```json
{
  "id": 501,
  "pin": "MALICIOUS;DROP TABLE properties;--"
}
```

### Payload 11: Self-Signed Official Receipt Hack
An attacker fabricates an Official Receipt claiming a cash clearing that maps to a random invoice without matching verification structures within the database.

### Payload 12: Audit Log Subversion
An attacker attempts to manually append or delete system security traces directly from client libraries.

---

## 3. Test Runner (Conceptual Rules Validation)

All above cases must evaluate successfully to `PERMISSION_DENIED`. The security ruleset is compiled under absolute zero trust parameters to guarantee the strict execution of these boundaries.
