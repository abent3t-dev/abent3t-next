import { toast } from 'sonner';

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast.info(message),
  warning: (message: string) => toast.warning(message),
  confirm: (message: string): Promise<boolean> =>
    new Promise((resolve) => {
      toast(message, {
        duration: Infinity,
        action: {
          label: 'Confirmar',
          onClick: () => resolve(true),
        },
        cancel: {
          label: 'Cancelar',
          onClick: () => resolve(false),
        },
        onDismiss: () => resolve(false),
      });
    }),
};
