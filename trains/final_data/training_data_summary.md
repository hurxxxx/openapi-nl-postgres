# SQL Training Data Summary

## Overview
Total training data items: 379

## Breakdown by Table
- smtp_company_info: 91 items
- smtp_financial_company: 90 items
- smtp_financial_data: 98 items
- rb_master_company: 50 items
- complex_queries: 50 items

## Sample Questions
### Sample 1
Question: 모든 회사의 이름과 주소를 조회해줘
```sql
SELECT company_name, address FROM smtp_company_info
```

### Sample 2
Question: 서울에 있는 회사들의 목록을 보여줘
```sql
SELECT company_name, address, phone_number FROM smtp_company_info WHERE address LIKE '%서울%'
```

### Sample 3
Question: 부산에 위치한 회사들을 찾아줘
```sql
SELECT company_name, address, phone_number FROM smtp_company_info WHERE address LIKE '%부산%'
```

### Sample 4
Question: IT 산업에 속한 회사들을 보여줘
```sql
SELECT company_name, industry FROM smtp_company_info WHERE industry LIKE '%IT%' OR industry LIKE '%소프트웨어%' OR industry LIKE '%정보%'
```

### Sample 5
Question: 제조업 회사들의 목록을 조회해줘
```sql
SELECT company_name, industry FROM smtp_company_info WHERE industry LIKE '%제조%'
```

### Sample 6
Question: 직원 수가 100명 이상인 회사들을 찾아줘
```sql
SELECT company_name, employee_count FROM smtp_company_info WHERE CAST(employee_count AS INTEGER) >= 100
```

### Sample 7
Question: 직원 수가 1000명 이상인 대기업 목록을 보여줘
```sql
SELECT company_name, employee_count FROM smtp_company_info WHERE CAST(employee_count AS INTEGER) >= 1000
```

### Sample 8
Question: 2010년 이후에 설립된 회사들을 찾아줘
```sql
SELECT company_name, establishment_date FROM smtp_company_info WHERE CAST(establishment_date AS INTEGER) >= 2010
```

### Sample 9
Question: 웹사이트가 있는 회사들의 목록을 보여줘
```sql
SELECT company_name, website FROM smtp_company_info WHERE website IS NOT NULL AND website != ''
```

### Sample 10
Question: 이메일 주소가 등록된 회사들을 찾아줘
```sql
SELECT company_name, email FROM smtp_company_info WHERE email IS NOT NULL AND email != ''
```

