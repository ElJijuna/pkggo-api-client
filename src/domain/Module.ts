export interface GoModuleInfo {
  Version: string;
  Time: string;
  Origin?: {
    VCS?: string;
    URL?: string;
    Hash?: string;
    Ref?: string;
  };
}
