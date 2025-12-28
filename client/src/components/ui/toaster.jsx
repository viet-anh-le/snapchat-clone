import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => {
        return (
          <Toast
            key={id}
            {...props}
            className={`
              grid gap-1 
              border-0 
              rounded-3xl 
              shadow-[0_8px_30px_rgb(0,0,0,0.12)] 
              px-6 py-4
              items-center
              
              ${
                variant === "destructive"
                  ? "bg-red-500 text-white"
                  : "bg-[#FFFC00] text-black"
              }
            `}
          >
            <div className="grid gap-1">
              {title && (
                <ToastTitle className="text-base font-extrabold tracking-tight">
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription
                  className={`text-sm font-medium ${
                    variant === "destructive" ? "text-red-100" : "text-black/80"
                  }`}
                >
                  {description}
                </ToastDescription>
              )}
            </div>

            {action}

            {/* Nút đóng tùy chỉnh lại cho hòa hợp */}
            <ToastClose
              className={`
               hover:bg-black/10 rounded-full p-1 transition-colors
               ${
                 variant === "destructive"
                   ? "text-white hover:text-white"
                   : "text-black"
               }
            `}
            />
          </Toast>
        );
      })}
      <ToastViewport className="p-6 gap-2 flex-col-reverse sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastProvider>
  );
}
