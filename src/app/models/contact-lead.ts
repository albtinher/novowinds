export interface ContactLead {
  course: string;
  fullName: string;
  email: string;
  phone?: string;
  message: string;
  /** Campo trampa antispam: siempre vacio en envios legitimos. */
  website?: string;
}
