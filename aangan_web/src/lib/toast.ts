import toast from 'react-hot-toast';

/**
 * Hindi-first toast notifications for Aangan.
 * All messages follow: हिंदी — English
 * Designed for Dadi Test compliance.
 */

export function toastSuccess(hindi: string, english?: string) {
  toast.success(english ? `${hindi}\n${english}` : hindi, {
    duration: 3000,
    style: {
      background: '#f0fdf4',
      color: '#15803d',
      border: '1px solid #7A9A3A',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '15px',
      lineHeight: '1.5',
      padding: '14px 18px',
      maxWidth: '90vw',
      whiteSpace: 'pre-line',
    },
    iconTheme: { primary: '#7A9A3A', secondary: '#fff' },
  });
}

export function toastError(hindi: string, english?: string) {
  toast.error(english ? `${hindi}\n${english}` : hindi, {
    duration: 4000,
    style: {
      background: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #dc2626',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '15px',
      lineHeight: '1.5',
      padding: '14px 18px',
      maxWidth: '90vw',
      whiteSpace: 'pre-line',
    },
    iconTheme: { primary: '#dc2626', secondary: '#fff' },
  });
}

export function toastInfo(hindi: string, english?: string) {
  toast(english ? `${hindi}\n${english}` : hindi, {
    duration: 3000,
    icon: 'ℹ️',
    style: {
      background: '#FDFAF0',
      color: '#78350f',
      border: '1px solid #C8A84B',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '15px',
      lineHeight: '1.5',
      padding: '14px 18px',
      maxWidth: '90vw',
      whiteSpace: 'pre-line',
    },
  });
}
