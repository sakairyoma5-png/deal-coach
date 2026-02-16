import { useLocation, Link } from "wouter";
import { LayoutDashboard, BookOpen, MessageSquare, BarChart3, Calendar } from "lucide-react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Home" },
  { path: "/skills", icon: BookOpen, label: "Skills" },
  { path: "/roleplay", icon: MessageSquare, label: "RP" },
  { path: "/diagnosis", icon: BarChart3, label: "Diag" },
  { path: "/calendar", icon: Calendar, label: "Cal" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border" data-testid="nav-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`nav-link-${item.label.toLowerCase()}`}
            >
              <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
