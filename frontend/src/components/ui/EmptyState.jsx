import { PackageOpen } from "lucide-react";

const EmptyState = ({ title = "Nothing here yet", message = "There are no records to show.", action }) => (
  <div className="ui-empty-state"><span className="empty-state-icon"><PackageOpen size={23} /></span><strong>{title}</strong><p>{message}</p>{action}</div>
);

export default EmptyState;
