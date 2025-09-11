import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface SecurityPolicy {
  id: string;
  dealer_id: number;
  policy_name: string;
  policy_value: any;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special: boolean;
  max_age_days: number;
  history_count: number;
  max_attempts: number;
  lockout_duration_minutes: number;
}

export const defaultPasswordPolicy: PasswordPolicy = {
  min_length: 8,
  require_uppercase: true,
  require_lowercase: true,
  require_numbers: true,
  require_special: false,
  max_age_days: 90,
  history_count: 5,
  max_attempts: 5,
  lockout_duration_minutes: 30
};

export const usePasswordPolicies = (dealerId: number) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>(defaultPasswordPolicy);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('security_policies')
        .select('*')
        .eq('dealer_id', dealerId)
        .eq('is_active', true);

      if (error) throw error;

      setPolicies(data || []);
      
      // Find password policy
      const passwordPolicyData = data?.find(p => p.policy_name === 'password_policy');
      if (passwordPolicyData && passwordPolicyData.policy_value) {
        setPasswordPolicy({
          ...defaultPasswordPolicy,
          ...(passwordPolicyData.policy_value as Partial<PasswordPolicy>)
        });
      }

    } catch (error: any) {
      console.error('Error fetching policies:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('password_management.fetch_policies_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePasswordPolicy = async (newPolicy: Partial<PasswordPolicy>) => {
    try {
      setLoading(true);
      
      const updatedPolicy = { ...passwordPolicy, ...newPolicy };
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('security_policies')
        .upsert({
          dealer_id: dealerId,
          policy_name: 'password_policy',
          policy_value: updatedPolicy,
          is_active: true,
          created_by: user.id
        }, {
          onConflict: 'dealer_id,policy_name'
        });

      if (error) throw error;

      setPasswordPolicy(updatedPolicy);
      
      toast({
        title: t('common.success'),
        description: t('password_management.policy_updated'),
      });

      // Refresh policies
      await fetchPolicies();

    } catch (error: any) {
      console.error('Error updating password policy:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('password_management.policy_update_error'),
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createSecurityPolicy = async (
    policyName: string,
    policyValue: any
  ) => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('security_policies')
        .insert({
          dealer_id: dealerId,
          policy_name: policyName,
          policy_value: policyValue,
          is_active: true,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('password_management.policy_created'),
      });

      await fetchPolicies();

    } catch (error: any) {
      console.error('Error creating policy:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('password_management.policy_create_error'),
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteSecurityPolicy = async (policyId: string) => {
    try {
      const { error } = await supabase
        .from('security_policies')
        .update({ is_active: false })
        .eq('id', policyId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('password_management.policy_deleted'),
      });

      await fetchPolicies();

    } catch (error: any) {
      console.error('Error deleting policy:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('password_management.policy_delete_error'),
        variant: 'destructive',
      });
      throw error;
    }
  };

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < passwordPolicy.min_length) {
      errors.push(t('password_management.validation.min_length', { length: passwordPolicy.min_length }));
    }

    if (passwordPolicy.require_uppercase && !/[A-Z]/.test(password)) {
      errors.push(t('password_management.validation.uppercase'));
    }

    if (passwordPolicy.require_lowercase && !/[a-z]/.test(password)) {
      errors.push(t('password_management.validation.lowercase'));
    }

    if (passwordPolicy.require_numbers && !/\d/.test(password)) {
      errors.push(t('password_management.validation.numbers'));
    }

    if (passwordPolicy.require_special && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push(t('password_management.validation.special'));
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const generateSecurePassword = (): string => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()';
    
    let charset = '';
    let password = '';
    
    // Ensure required character types are included
    if (passwordPolicy.require_lowercase) {
      charset += lowercase;
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
    }
    
    if (passwordPolicy.require_uppercase) {
      charset += uppercase;
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
    }
    
    if (passwordPolicy.require_numbers) {
      charset += numbers;
      password += numbers[Math.floor(Math.random() * numbers.length)];
    }
    
    if (passwordPolicy.require_special) {
      charset += special;
      password += special[Math.floor(Math.random() * special.length)];
    }
    
    if (!charset) {
      charset = lowercase + uppercase + numbers;
    }
    
    // Fill remaining length
    for (let i = password.length; i < passwordPolicy.min_length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  useEffect(() => {
    if (dealerId) {
      fetchPolicies();
    }
  }, [dealerId]);

  return {
    loading,
    policies,
    passwordPolicy,
    fetchPolicies,
    updatePasswordPolicy,
    createSecurityPolicy,
    deleteSecurityPolicy,
    validatePassword,
    generateSecurePassword
  };
};