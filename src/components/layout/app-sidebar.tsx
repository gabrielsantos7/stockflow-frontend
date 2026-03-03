import { Separator } from '@radix-ui/react-separator';
import { Link } from '@tanstack/react-router';
import {
	LayoutDashboard,
	type LucideIcon,
	TrendingUp,
	Wallet,
} from 'lucide-react';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar';
import logo from '/logo.png';
import { ThemeToggler } from '../theme/theme-toggler';

interface MenuItem {
	title: string;
	url: string;
	icon: LucideIcon;
}

const menuItems: MenuItem[] = [
	{
		title: 'Dashboard',
		url: '/dashboard',
		icon: LayoutDashboard,
	},
	{
		title: 'Accounts',
		url: '/accounts',
		icon: Wallet,
	},
	{
		title: 'Stocks',
		url: '/stocks',
		icon: TrendingUp,
	},
];

export function AppSidebar() {
	const { open } = useSidebar();

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				{open ? (
					<div className="flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
						<Link to="/dashboard" className="flex items-center gap-3">
							<div className="flex items-center gap-4">
								<img src={logo} alt="Logo" className="size-10" />
								<span className="text-xl font-bold text-foreground">
									StockFlow
								</span>
							</div>
						</Link>
					</div>
				) : (
					<img src={logo} alt="Logo" className="size-6" />
				)}
			</SidebarHeader>
			<Separator orientation="horizontal" />
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{menuItems.map(item => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild>
										<Link
											to={item.url}
											className="text-muted-foreground [&.active]:bg-emerald-500 [&.active]:text-foreground font-semibold"
										>
											<item.icon className="size-5" strokeWidth={2.5} />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<ThemeToggler />
				{open && (
					<span className="text-xs text-muted-foreground">
						&copy; {new Date().getFullYear()} StockFlow. All rights reserved.
					</span>
				)}
			</SidebarFooter>
		</Sidebar>
	);
}
