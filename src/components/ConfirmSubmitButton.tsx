'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from '@/components/Button';

type ConfirmSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  confirmMessage: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
};

export function ConfirmSubmitButton({
  children,
  confirmMessage,
  type = 'submit',
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  return (
    <Button
      {...props}
      type={type}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented) return;

        const shouldContinue = window.confirm(confirmMessage);

        if (!shouldContinue) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </Button>
  );
}
