"use client";
import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "donate";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-ink text-paper hover:bg-ink-2 focus-visible:outline-ink",
  secondary:
    "bg-fog text-ink hover:bg-mist ring-1 ring-mist",
  ghost:
    "bg-transparent text-ink hover:bg-fog ring-1 ring-mist",
  donate:
    "bg-red text-paper hover:bg-red-deep shadow-soft hover:shadow-lift",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-4 text-caption",
  md: "h-11 px-5 text-body",
  lg: "h-12 px-6 text-body-lg",
};

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium font-sans tracking-tight transition-all duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<React.ComponentProps<typeof Link>, "className" | "children"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

// ─── Fireworks ───────────────────────────────────────────────────────────────

const FW_COLORS = [
  "#FFD700", "#FF4136", "#7FDBFF", "#FFFFFF", "#FF69B4", "#2ECC40", "#FF851B",
];

const CW = 440;
const CH = 440;

type Trail = { x: number; y: number }[];

type Rocket = {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  trail: Trail;
  exploded: boolean;
};

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  alpha: number;
  trail: Trail;
};

function explodeAt(
  x: number,
  y: number,
  color: string,
  particles: Particle[],
) {
  // Uniform radial burst — evenly spaced like a real shell
  const RING = 52;
  for (let i = 0; i < RING; i++) {
    const angle = (i / RING) * Math.PI * 2;
    const speed = 1.4 + Math.random() * 0.8;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      alpha: 1,
      trail: [],
    });
  }
  // White sparkle halo
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.6 + Math.random() * 1.8;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: "#FFFFFF",
      alpha: 0.95,
      trail: [],
    });
  }
}

function FireworksWrapper({ children }: { children: React.ReactNode }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animRef = React.useRef<number>(0);

  React.useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const launch = React.useCallback(() => {
    cancelAnimationFrame(animRef.current);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Detect if the button is near the top of the viewport
    const wrapperRect = canvas.parentElement?.getBoundingClientRect();
    const isNearTop = wrapperRect
      ? wrapperRect.top < window.innerHeight * 0.18
      : false;

    if (isNearTop) {
      // Header button: canvas hangs below, particles shower downward
      canvas.style.transform = "translate(-50%, 5%)";
    } else {
      // Normal: canvas floats above, rockets launch upward
      canvas.style.transform = "translate(-50%, -88%)";
    }

    ctx.clearRect(0, 0, CW, CH);

    const rockets: Rocket[] = [];
    const particles: Particle[] = [];
    let frame = 0;

    if (isNearTop) {
      // ── Header mode: three staggered bursts from near canvas top ──────────
      const burstDefs = [
        { x: CW * 0.35, y: 30, delay: 0 },
        { x: CW * 0.65, y: 30, delay: 20 },
        { x: CW * 0.50, y: 30, delay: 40 },
      ];

      const animate = () => {
        const c = canvasRef.current;
        if (!c) return;
        const context = c.getContext("2d");
        if (!context) return;

        context.clearRect(0, 0, CW, CH);

        for (const def of burstDefs) {
          if (frame === def.delay) {
            explodeAt(
              def.x,
              def.y,
              FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)],
              particles,
            );
          }
        }

        let alive = frame < burstDefs[burstDefs.length - 1].delay;

        for (const p of particles) {
          if (p.alpha <= 0) continue;
          alive = true;

          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 12) p.trail.shift();

          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.038;
          p.vx *= 0.995;
          p.vy *= 0.995;
          p.alpha -= 0.004;

          for (let i = 0; i < p.trail.length; i++) {
            const t = i / p.trail.length;
            context.save();
            context.globalAlpha = Math.max(0, t * p.alpha * 0.55);
            context.fillStyle = p.color;
            context.beginPath();
            context.arc(p.trail[i].x, p.trail[i].y, 1.2, 0, Math.PI * 2);
            context.fill();
            context.restore();
          }

          context.save();
          context.globalAlpha = Math.max(0, p.alpha);
          context.fillStyle = p.color;
          context.beginPath();
          context.arc(p.x, p.y, 3, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }

        frame++;
        if (alive) animRef.current = requestAnimationFrame(animate);
      };

      animate();
    } else {
      // ── Normal mode: rockets ascend then burst ─────────────────────────────
      const LAUNCH_Y = CH - 40;

      const rocketDefs = [
        { x: CW * 0.38, vx: -0.3, delay: 0 },
        { x: CW * 0.62, vx:  0.3, delay: 24 },
        { x: CW * 0.50, vx:  0.0, delay: 48 },
      ];

      const animate = () => {
        const c = canvasRef.current;
        if (!c) return;
        const context = c.getContext("2d");
        if (!context) return;

        context.clearRect(0, 0, CW, CH);

        for (const def of rocketDefs) {
          if (frame === def.delay) {
            rockets.push({
              x: def.x,
              y: LAUNCH_Y,
              vx: def.vx,
              vy: -(8 + Math.random()),
              color: FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)],
              trail: [],
              exploded: false,
            });
          }
        }

        // Draw rockets
        for (const r of rockets) {
          if (r.exploded) continue;

          r.trail.push({ x: r.x, y: r.y });
          if (r.trail.length > 16) r.trail.shift();

          r.x += r.vx;
          r.y += r.vy;
          r.vy += 0.16;

          if (r.vy >= 0) {
            r.exploded = true;
            explodeAt(r.x, r.y, r.color, particles);
            continue;
          }

          for (let i = 0; i < r.trail.length; i++) {
            const t = i / r.trail.length;
            context.save();
            context.globalAlpha = t * 0.85;
            context.fillStyle = r.color;
            context.beginPath();
            context.arc(r.trail[i].x, r.trail[i].y, 1.5 * t + 0.4, 0, Math.PI * 2);
            context.fill();
            context.restore();
          }

          context.save();
          context.globalAlpha = 1;
          context.fillStyle = "#FFFFFF";
          context.beginPath();
          context.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }

        // Draw particles
        let alive = rockets.some(r => !r.exploded);

        for (const p of particles) {
          if (p.alpha <= 0) continue;
          alive = true;

          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 12) p.trail.shift();

          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.038;
          p.vx *= 0.995;
          p.vy *= 0.995;
          p.alpha -= 0.004;

          for (let i = 0; i < p.trail.length; i++) {
            const t = i / p.trail.length;
            context.save();
            context.globalAlpha = Math.max(0, t * p.alpha * 0.55);
            context.fillStyle = p.color;
            context.beginPath();
            context.arc(p.trail[i].x, p.trail[i].y, 1.2, 0, Math.PI * 2);
            context.fill();
            context.restore();
          }

          context.save();
          context.globalAlpha = Math.max(0, p.alpha);
          context.fillStyle = p.color;
          context.beginPath();
          context.arc(p.x, p.y, 3, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }

        frame++;
        if (alive) animRef.current = requestAnimationFrame(animate);
      };

      animate();
    }
  }, []);

  return (
    <span className="relative inline-flex" onMouseEnter={launch}>
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="absolute pointer-events-none"
        style={{
          left: "50%",
          top: "50%",
          // Default; overridden at runtime in launch()
          transform: "translate(-50%, -88%)",
          zIndex: 50,
        }}
      />
      {children}
    </span>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, children, ...rest } = props;
  const classes = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    className,
  );

  let inner: React.ReactNode;
  if ("href" in rest && rest.href) {
    inner = (
      <Link {...(rest as ButtonAsLink)} className={classes}>
        {children}
      </Link>
    );
  } else {
    inner = (
      <button {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)} className={classes}>
        {children}
      </button>
    );
  }

  const isDonateLink =
    "href" in rest &&
    typeof rest.href === "string" &&
    rest.href.startsWith("/donate");

  if (variant === "donate" || isDonateLink) {
    return <FireworksWrapper>{inner}</FireworksWrapper>;
  }

  return inner;
}
