const SESSION_KEY = 'canteen-session-id';
const ROLE_KEY = 'canteen-role';
const CUSTOMER_KEY = 'canteen-customer-id';
const ONBOARDED_KEY = 'canteen-onboarded';

export const getSessionId = (): string => {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

export const getCustomerId = (): string | null => localStorage.getItem(CUSTOMER_KEY);
export const setCustomerId = (id: string) => localStorage.setItem(CUSTOMER_KEY, id);

export const getRole = (): string | null => localStorage.getItem(ROLE_KEY);
export const setRole = (role: string) => localStorage.setItem(ROLE_KEY, role);
export const clearRole = () => localStorage.removeItem(ROLE_KEY);

export const isOnboarded = (): boolean => localStorage.getItem(ONBOARDED_KEY) === 'true';
export const setOnboarded = () => localStorage.setItem(ONBOARDED_KEY, 'true');

export const STAFF_PASSWORD = '628400';
