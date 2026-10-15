import api from '../api/client';
import { isDemo } from './env';
import { CertificateValues, LayoutConfig } from './certificate';
import { downloadCertificatePdf } from './certificatePdf';

/** Link target for a public verification page, valid for the active router. */
export function verifyHref(token: string): string {
  return isDemo ? `#/verify/${token}` : `/verify/${token}`;
}

/** Absolute URL encoded into QR codes and shown to people. */
export function verifyAbsoluteUrl(token: string): string {
  const { origin, pathname } = window.location;
  return isDemo ? `${origin}${pathname}#/verify/${token}` : `${origin}/verify/${token}`;
}

export interface CertificateRenderData {
  layoutConfig: LayoutConfig;
  values: CertificateValues;
  verifyUrl: string;
  fileName: string;
  backgroundDataUrl?: string | null;
}

/**
 * Downloads a certificate PDF. With the real backend it opens the download
 * endpoint. In demo mode the PDF is built in the browser from the template.
 */
export async function downloadCertificate(certId: string): Promise<void> {
  if (!isDemo) {
    window.open(`/api/v1/certificates/${certId}/download`, '_blank', 'noopener');
    return;
  }
  const res = await api.get(`/certificates/${certId}/render-data`);
  const data: CertificateRenderData = res.data.data;
  await downloadCertificatePdf(
    {
      layout: data.layoutConfig,
      values: data.values,
      verifyUrl: data.verifyUrl,
      backgroundDataUrl: data.backgroundDataUrl,
    },
    data.fileName,
  );
}
