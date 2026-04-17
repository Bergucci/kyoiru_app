export interface DeleteAccountResult {
  status: 'scheduled';
  requestedAt: Date;
  loginDisabledAt: Date;
  purge24hAfter: Date;
  purge30dAfter: Date;
  purge180dAfter: Date;
  purge7yAfter: Date;
}

export interface AccountDeletionJobResult {
  purge24hUsers: string[];
  purge30dUsers: string[];
  purge180dUsers: string[];
  purge7yUsers: string[];
}
