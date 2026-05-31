import { Badge } from "../../atoms";
import styles from "./TabBar.module.css";

/* tabs: [{ id, label, icon, count }] */
const TabBar = ({ tabs, active, onChange }) => (
  <div className={styles.tabs} role="tablist">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        role="tab"
        aria-selected={active === tab.id}
        className={`${styles.tab} ${active === tab.id ? styles.active : ""}`}
        onClick={() => onChange(tab.id)}
      >
        {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
        {tab.label}
        {tab.count > 0 && <Badge variant="brand" size="sm" className={styles.count}>{tab.count}</Badge>}
      </button>
    ))}
  </div>
);

export default TabBar;
