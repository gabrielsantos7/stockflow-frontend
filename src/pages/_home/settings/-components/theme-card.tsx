import { Laptop, type LucideIcon, Moon, Palette, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	setTheme,
	type Theme,
	useTheme,
} from '@/integrations/tanstack-store/stores/theme.store';

interface ThemeOption {
	value: Theme;
	label: string;
	icon: LucideIcon;
}

const themeOptions: ThemeOption[] = [
	{ value: 'light', label: 'Light', icon: Sun },
	{ value: 'dark', label: 'Dark', icon: Moon },
	{ value: 'system', label: 'System', icon: Laptop },
];

export function ThemeCard() {
	const theme = useTheme();

	return (
		<Card className="bg-card border-border">
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
						<Palette className="size-5 text-emerald-500" />
					</div>
					<div>
						<CardTitle className="text-foreground">Theme</CardTitle>
						<CardDescription className="text-muted-foreground">
							Choose how StockFlow looks for you
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col md:flex-row items-center gap-3">
					{themeOptions.map(option => {
						const isActive = theme === option.value;
						const Icon = option.icon;

						return (
							<Button
								key={option.value}
								type="button"
								variant={isActive ? 'primary' : 'outline'}
								className="w-full md:w-28"
								onClick={() => setTheme(option.value)}
							>
								<Icon className="size-4" />
								{option.label}
							</Button>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
