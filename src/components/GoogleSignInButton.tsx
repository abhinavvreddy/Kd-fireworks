import React, { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../utils/googleAuth';

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => void;
  onError?: (err: Error) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  text = 'continue_with',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const render = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (response?.credential) {
              onSuccess(response.credential);
            } else if (onError) {
              onError(new Error('No credential returned by Google Identity Services.'));
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'filled_black',
          size: 'large',
          type: 'standard',
          text,
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
        });

        if (isMounted) setSdkReady(true);
      } catch (err: any) {
        if (onError) onError(err);
      }
    };

    if (window.google?.accounts?.id) {
      render();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          render();
        }
      }, 200);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [onSuccess, onError, text]);

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[46px] my-1">
      <div ref={containerRef} className="flex justify-center" />
      {!sdkReady && (
        <div className="text-[11px] text-slate-500 animate-pulse py-1">
          Loading secure Google Sign-In...
        </div>
      )}
    </div>
  );
};
