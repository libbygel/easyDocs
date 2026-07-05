# תרשימי מערכת — EasyDocs

> תרשימים בפורמט Mermaid. ניתן לצפות בהם ב‑VS Code (תצוגה מקדימה של Markdown), ב‑GitHub, או בכל עורך התומך ב‑Mermaid.

---

## 1. תרשים זרימה: תהליך פתיחת תיק

```mermaid
flowchart TD
    A([יועץ מתחבר למערכת]) --> B[יצירת/בחירת לקוח]
    B --> C[פתיחת תיק חדש ושיוך ללקוח]
    C --> D[בחירת סוג תיק והגדרת מסמכים נדרשים מתבניות]
    D --> E[שליחת קישור פורטל מאובטח ללקוח]
    E --> F{הלקוח נכנס לפורטל}
    F -->|מעלה מסמכים| G[העלאת מסמכים נדרשים]
    F -->|חותם| H[חתימה דיגיטלית מרחוק]
    G --> I[התראה ליועץ + עדכון סטטוס]
    H --> I
    I --> J{סקירת המסמכים על ידי היועץ}
    J -->|חסר/לא תקין| K[שליחת תזכורת ללקוח]
    K --> F
    J -->|תקין| L[אישור המסמך]
    L --> M{כל המסמכים אושרו?}
    M -->|לא| K
    M -->|כן| N[סטטוס: מוכן להגשה]
    N --> O[שליחת התיק לבנקאי / גורם חיצוני]
    O --> P([סגירת התיק + תיעוד ביומן הפעילות])
```

---

## 2. דיאגרמת ישויות (ERD)

```mermaid
erDiagram
    ADVISOR ||--o{ CLIENT : "מנהל"
    ADVISOR ||--o{ CASE : "אחראי"
    ADVISOR ||--o{ TASK : "יוצר"
    ADVISOR ||--o{ CONTACT : "מנהל"
    ADVISOR ||--o{ TEMPLATE : "מגדיר"
    ADVISOR ||--o{ NOTIFICATION : "מקבל"

    CLIENT ||--o{ CASE : "משויך ל"
    CLIENT ||--o{ DOCUMENT : "מעלה"
    CLIENT ||--o{ PASSWORD_VAULT : "כספת"
    CLIENT ||--o{ CONVERSATION : "תיעוד שיחות"

    CASE ||--o{ DOCUMENT : "כולל"
    CASE ||--o{ SIGNATURE_DOC : "כולל"
    CASE ||--o{ TASK : "משימות"
    CASE ||--o{ RECURRING_CHARGE : "חיובים"
    CASE ||--o{ ACTIVITY_LOG : "פעילות"
    CASE ||--|| CASE_TYPE : "מסוג"

    CASE_TYPE ||--o{ TEMPLATE : "תבניות"
    DOCUMENT ||--o| SIGNATURE_DOC : "חתימה"
    TEMPLATE ||--o{ DOCUMENT : "נוצר מתבנית"
    EMAIL_QUEUE }o--|| CLIENT : "נמען"

    ADVISOR {
        uuid id PK
        string name
        string email
        string sender_display_name
        numeric hourly_rate
        string timer_mode
    }
    CLIENT {
        uuid id PK
        uuid advisor_id FK
        string full_name
        string national_id
        string phone
        string email
    }
    CASE {
        uuid id PK
        uuid advisor_id FK
        uuid client_id FK
        uuid case_type_id FK
        string title
        string status
        numeric tracked_hours
    }
    CASE_TYPE {
        uuid id PK
        uuid advisor_id FK
        string name
    }
    DOCUMENT {
        uuid id PK
        uuid case_id FK
        uuid client_id FK
        string name
        string type
        string status
        string file_path
    }
    SIGNATURE_DOC {
        uuid id PK
        uuid document_id FK
        uuid case_id FK
        string signature_data
        string signed_pdf_path
    }
    TASK {
        uuid id PK
        uuid advisor_id FK
        uuid case_id FK
        uuid client_id FK
        string title
        string priority
        date due_date
        timestamp reminder_at
        boolean is_completed
    }
    CONTACT {
        uuid id PK
        uuid advisor_id FK
        string name
        string phone
        string email
    }
    TEMPLATE {
        uuid id PK
        uuid advisor_id FK
        uuid case_type_id FK
        string name
        string content
    }
    RECURRING_CHARGE {
        uuid id PK
        uuid case_id FK
        numeric amount
        string frequency
        string status
    }
    PASSWORD_VAULT {
        uuid id PK
        uuid client_id FK
        string encrypted_data
    }
    CONVERSATION {
        uuid id PK
        uuid client_id FK
        text note
        timestamp created_at
    }
    NOTIFICATION {
        uuid id PK
        uuid advisor_id FK
        string type
        boolean is_read
    }
    EMAIL_QUEUE {
        uuid id PK
        uuid client_id FK
        string template
        string status
    }
    ACTIVITY_LOG {
        uuid id PK
        uuid case_id FK
        string action
        timestamp created_at
    }
```

---

> הערה: שמות השדות וההיררכיה הם ברמת אפיון על‑בסיס מבנה המערכת. שמות עמודות מדויקים עשויים להשתנות מעט במימוש בפועל.
