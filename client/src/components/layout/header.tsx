import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
  breadcrumb: string;
}

export default function Header({ title, breadcrumb }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-text-secondary">
            <ol className="flex items-center space-x-2">
              <li>
                <a href="/" className="hover:text-primary-orange transition-colors">
                  Home
                </a>
              </li>
              <li className="text-gray-400">/</li>
              <li className="text-text-primary font-medium">{breadcrumb}</li>
            </ol>
          </nav>
          <h2 className="text-2xl font-bold text-text-primary mt-1">{title}</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input
              type="search"
              placeholder="Buscar produtos, clientes..."
              className="pl-10 pr-4 py-2 w-80 focus:ring-2 focus:ring-primary-orange focus:border-transparent"
            />
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
          </div>
          <Button variant="ghost" size="sm" className="relative p-2">
            <Bell className="h-5 w-5 text-text-secondary" />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 bg-danger"
            >
              3
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
}
