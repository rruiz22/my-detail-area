# Translation Guidelines for My Detail Area Enterprise

## 🎯 Overview

This document provides comprehensive guidelines for implementing and maintaining translations in the My Detail Area enterprise application. Following these guidelines ensures 100% translation coverage and consistent user experience across all supported languages.

## 📋 Translation Requirements

### 1. **100% Translation Coverage Policy**
- All user-facing text MUST be translated
- No hardcoded strings allowed in production code
- All new components must include translation keys from development start
- Regular audits required to maintain coverage

### 2. **Supported Languages**
- English (en) - Primary/fallback language
- Spanish (es) - Secondary language  
- Portuguese Brazil (pt-BR) - Secondary language

## 🛠 Implementation Guidelines

### 1. **Setting Up Translations in Components**

```tsx
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('my_component.title')}</h1>
      <p>{t('my_component.description')}</p>
    </div>
  );
}
```

### 2. **Translation Key Naming Convention**

#### **Hierarchical Structure**
```json
{
  "module": {
    "component": {
      "element": "Translation text"
    }
  }
}
```

#### **Key Naming Rules**
- Use `snake_case` for all keys
- Structure keys hierarchically by module/component
- Use descriptive, meaningful key names
- Prefix with module name for context

#### **Examples**
```json
{
  "nfc_tracking": {
    "tag_manager": {
      "title": "NFC Tag Manager",
      "create_tag": "Create New Tag",
      "delete_confirmation": "Are you sure you want to delete this tag?"
    },
    "workflows": {
      "title": "Workflow Manager",
      "active": "Active",
      "inactive": "Inactive"
    }
  },
  "recon": {
    "orders": {
      "create_order": "Create Recon Order",
      "stock_number": "Stock Number",
      "vehicle_display": "Vehicle Display"
    }
  }
}
```

### 3. **Common Translations Structure**

#### **Global Common Keys**
```json
{
  "common": {
    "create": "Create",
    "edit": "Edit", 
    "delete": "Delete",
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "active": "Active",
    "inactive": "Inactive",
    "status": "Status"
  }
}
```

#### **Form-Specific Common Keys**
```json
{
  "forms": {
    "validation": {
      "required": "This field is required",
      "invalid_email": "Please enter a valid email",
      "min_length": "Minimum {count} characters required"
    },
    "actions": {
      "submit": "Submit",
      "reset": "Reset",
      "clear": "Clear"
    }
  }
}
```

## 📝 Component-Specific Guidelines

### 1. **Modal Components**
```tsx
// ✅ CORRECT
<DialogTitle>{t('nfc.tag_manager.edit_tag_title')}</DialogTitle>
<DialogDescription>{t('nfc.tag_manager.edit_tag_description')}</DialogDescription>

// ❌ INCORRECT
<DialogTitle>Edit NFC Tag</DialogTitle>
<DialogDescription>Modify tag properties and settings</DialogDescription>
```

### 2. **Form Fields**
```tsx
// ✅ CORRECT  
<Label>{t('orders.vehicle_information.make')}</Label>
<Input placeholder={t('orders.vehicle_information.make_placeholder')} />

// ❌ INCORRECT
<Label>Vehicle Make</Label>
<Input placeholder="Enter vehicle make" />
```

### 3. **Buttons and Actions**
```tsx
// ✅ CORRECT
<Button>{t('common.create')}</Button>
<Button variant="destructive">{t('common.delete')}</Button>

// ❌ INCORRECT  
<Button>Create</Button>
<Button variant="destructive">Delete</Button>
```

### 4. **Toast Messages and Alerts**
```tsx
// ✅ CORRECT
toast({
  title: t('common.success'),
  description: t('nfc.tag_created_successfully')
});

// ❌ INCORRECT
toast({
  title: "Success",
  description: "NFC tag created successfully"
});
```

## 🏗 Developer Templates

### 1. **New Component Template**
```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MyComponentProps {
  className?: string;
}

export function MyComponent({ className }: MyComponentProps) {
  const { t } = useTranslation();
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('my_module.my_component.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{t('my_module.my_component.description')}</p>
      </CardContent>
    </Card>
  );
}
```

### 2. **Form Component Template**
```tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function MyForm() {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <Label>{t('my_module.form.field_label')}</Label>
        <Input 
          {...register('field', { required: true })}
          placeholder={t('my_module.form.field_placeholder')}
        />
        {errors.field && (
          <p className="error">{t('forms.validation.required')}</p>
        )}
      </div>
      
      <div className="actions">
        <Button type="button" variant="outline">
          {t('common.cancel')}
        </Button>
        <Button type="submit">
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
```

### 3. **Modal Component Template**  
```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface MyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function MyModal({ isOpen, onClose, onConfirm }: MyModalProps) {
  const { t } = useTranslation();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('my_module.modal.title')}</DialogTitle>
          <DialogDescription>
            {t('my_module.modal.description')}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onConfirm}>
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## 🔧 Automated Tools Usage

### 1. **Translation Scanner**
```bash
# Run complete translation audit
node scripts/translation-scanner.js

# Check specific files
node scripts/translation-scanner.js src/components/nfc/**
```

### 2. **Batch Fix Tool**
```bash
# Auto-fix common hardcoded strings
node scripts/translation-batch-fix.js fix

# Fix specific files
node scripts/translation-batch-fix.js fix src/components/nfc/**

# Restore backups if needed
node scripts/translation-batch-fix.js restore

# Clean up backup files  
node scripts/translation-batch-fix.js cleanup
```

### 3. **Pre-commit Hooks**
```bash
# Add to package.json scripts
"scripts": {
  "translation:audit": "node scripts/translation-scanner.js",
  "translation:fix": "node scripts/translation-batch-fix.js fix",
  "pre-commit": "npm run translation:audit"
}
```

## 📚 Translation Key Categories

### 1. **Module-Specific Keys**
- `nfc_tracking.*` - NFC tracking functionality
- `recon.*` - Reconditioning orders and processes  
- `service.*` - Service order management
- `sales_orders.*` - Sales order management
- `car_wash_orders.*` - Car wash orders
- `dealerships.*` - Dealership management
- `users.*` - User management
- `reports.*` - Reports and analytics

### 2. **UI Component Keys**
- `common.*` - Global common translations
- `forms.*` - Form-related translations
- `navigation.*` - Navigation elements
- `table.*` - Data table components
- `dashboard.*` - Dashboard elements

### 3. **System Keys**
- `auth.*` - Authentication and authorization
- `settings.*` - Application settings
- `messages.*` - System messages and notifications
- `errors.*` - Error messages

## 🚫 Anti-Patterns to Avoid

### 1. **Hardcoded Strings**
```tsx
// ❌ NEVER DO THIS
<h1>NFC Tag Manager</h1>
<Button>Create New Tag</Button>
<p>Are you sure you want to delete this item?</p>
```

### 2. **Non-Descriptive Keys**
```json
// ❌ BAD
{
  "text1": "Create",
  "btn2": "Delete", 
  "msg": "Success"
}

// ✅ GOOD
{
  "common": {
    "create": "Create",
    "delete": "Delete",
    "success": "Success"
  }
}
```

### 3. **Missing Context**
```tsx
// ❌ BAD - No context
t('title')

// ✅ GOOD - Clear context
t('nfc.tag_manager.title')
```

## 🎯 Quality Assurance

### 1. **Code Review Checklist**
- [ ] All user-facing text uses `t()` function
- [ ] Translation keys follow naming convention
- [ ] Keys are properly nested by module/component
- [ ] No hardcoded strings in JSX
- [ ] Common keys used for repeated text
- [ ] Fallback language (English) always complete

### 2. **Pre-deployment Checks**
- [ ] Translation coverage ≥ 95%
- [ ] All language files have matching key structure
- [ ] No missing translation keys in production
- [ ] All new features include translation keys

### 3. **Regular Maintenance**
- Weekly translation audits
- Monthly review of new keys
- Quarterly cleanup of unused keys
- Annual review of translation structure

## 📖 Best Practices Summary

1. **Always use useTranslation hook** in components
2. **Follow hierarchical key naming** convention
3. **Use common keys** for repeated text
4. **Provide meaningful key names** with context
5. **Test in all supported languages** before deployment
6. **Keep translations files organized** and well-structured
7. **Use automated tools** for detection and fixing
8. **Implement pre-commit hooks** to prevent new hardcoded strings
9. **Regular audits** to maintain 100% coverage
10. **Document new translation patterns** and update guidelines

## 🆘 Troubleshooting

### Common Issues and Solutions

1. **Translation not appearing**
   - Check if key exists in translation file
   - Verify key name matches exactly
   - Ensure useTranslation hook is imported and used

2. **Fallback language showing**
   - Check if key exists in target language file
   - Verify language file is properly loaded
   - Check for typos in key names

3. **Build errors with translations**
   - Ensure all translation files have valid JSON syntax  
   - Check for missing commas or brackets
   - Verify all referenced keys exist

For additional support, refer to the project's technical documentation or contact the development team.