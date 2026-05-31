import { forwardRef } from "react";
import styles from "./Card.module.css";

const Card = forwardRef(function Card(
  {
    as: Tag = "div",
    variant = "surface",
    elevation = 1,
    padding = "md",
    interactive = false,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const cls = [
    styles.card,
    styles[`variant_${variant}`],
    styles[`elev_${elevation}`],
    styles[`pad_${padding}`],
    interactive && styles.interactive,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag ref={ref} className={cls} {...rest}>
      {children}
    </Tag>
  );
});

export const CardHeader = ({ className = "", children, ...rest }) => (
  <div className={`${styles.header} ${className}`} {...rest}>{children}</div>
);

export const CardBody = ({ className = "", children, ...rest }) => (
  <div className={`${styles.body} ${className}`} {...rest}>{children}</div>
);

export const CardFooter = ({ className = "", children, ...rest }) => (
  <div className={`${styles.footer} ${className}`} {...rest}>{children}</div>
);

export default Card;
