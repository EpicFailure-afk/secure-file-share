import { FaMoon, FaSun } from "react-icons/fa";
import { useTheme } from "../theme/useTheme";
import styles from "./ThemeToggle.module.css";

const icons = { light: <FaSun />, dark: <FaMoon /> };
const labels = { light: "Light mode", dark: "Dark mode" };

const ThemeToggle = () => {
  const { resolved, cycleTheme } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={cycleTheme}
      aria-label={`Theme: ${labels[resolved]}. Click to switch to ${labels[next]}.`}
      title={labels[resolved]}
    >
      <span className={styles.icon} key={resolved}>{icons[resolved]}</span>
    </button>
  );
};

export default ThemeToggle;
