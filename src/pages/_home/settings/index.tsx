import { createFileRoute } from '@tanstack/react-router';
import { Loader } from '@/components/shared/loader';
import { ThemeCard } from './-components/theme-card';
import { UpdateProfileCard } from './-components/update-profile-card';

export const Route = createFileRoute('/_home/settings/')({
	head: () => ({
		meta: [{ title: 'Settings' }],
	}),
	component: Settings,
	pendingComponent: () => <Loader />,
});

function Settings() {
	return (
		<div className="space-y-6 pt-4">
			<UpdateProfileCard />
			<ThemeCard />
		</div>
	);
}
