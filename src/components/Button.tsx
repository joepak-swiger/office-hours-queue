import Link from 'next/link';
import { clsx } from 'clsx';

const variants = {
  primary: 'bg-campus text-white hover:bg-slateBlue',
  secondary: 'bg-white text-ink border border-slate-200 hover:border-campus',
  danger: 'bg-danger text-white hover:bg-red-800',
  success: 'bg-success text-white hover:bg-teal-800',
  ghost: 'bg-transparent text-campus hover:bg-calm'
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return <button className={clsx('focus-ring rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', variants[variant], className)} {...props} />;
}

export function ButtonLink({ href, children, className, variant = 'primary' }: { href: string; children: React.ReactNode; className?: string; variant?: keyof typeof variants }) {
  return <Link href={href} className={clsx('focus-ring inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition', variants[variant], className)}>{children}</Link>;
}
