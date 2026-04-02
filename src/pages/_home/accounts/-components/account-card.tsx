import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Decimal } from 'decimal.js';
import {
	DollarSign,
	Eye,
	LoaderCircle,
	MoreVertical,
	ShoppingCart,
	Trash2,
	Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import CountUp from '@/components/CountUp';
import { StockLogo } from '@/components/shared/stock-logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getListAllAccountsQueryKey } from '@/http/requests/users';
import type { AccountResponseDto, ErrorResponseDto } from '@/http/schemas';
import { useAuth } from '@/integrations/tanstack-store/stores/auth.store';
import { orvalClient } from '@/lib/orval/orval.client';
import { formatCurrency } from '@/utils/formatters';
import { BuyStockModal } from '../../stocks/-components/buy-stock-modal';
import { AccountDetailsModal } from './account-details-modal';
import { SellStockModal } from './sell-stock-modal';

const deleteAccountById = (accountId: string) => {
	return orvalClient<void>({
		url: `/accounts/${accountId}`,
		method: 'DELETE',
	});
};

export function AccountCard({ account }: { account: AccountResponseDto }) {
	const { user } = useAuth();
	const userId = user?.userId;
	const queryClient = useQueryClient();

	const totalValue = useMemo(
		() =>
			account.stocks?.reduce((sum, stock) => {
				return sum.plus(new Decimal(stock.total));
			}, new Decimal(0)),
		[account.stocks]
	);

	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const [isBuyOpen, setIsBuyOpen] = useState(false);
	const hasStocks = (account.stocks?.length ?? 0) > 0;
	const [isSellOpen, setIsSellOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const { mutate: deleteAccount, isPending: isDeletingAccount } = useMutation<
		void,
		ErrorResponseDto,
		string
	>({
		mutationFn: deleteAccountById,
		onSuccess: () => {
			toast.success('Account deleted successfully');
			setIsDeleteDialogOpen(false);
			if (userId) {
				queryClient.invalidateQueries({
					queryKey: getListAllAccountsQueryKey(userId),
				});
			}
		},
		onError: error => {
			const description =
				error.message || 'An unexpected error occurred while deleting account';
			toast.error('Error deleting account', { description });
		},
	});

	const handleDeleteAccount = () => {
		if (hasStocks) {
			return;
		}

		deleteAccount(account.accountId);
	};

	return (
		<Card
			key={account.accountId}
			className="bg-card border-border hover:border-emerald-500 duration-300 transition-colors group"
		>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<div className="flex items-center gap-3">
					<div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-emerald-500/10">
						<Wallet className="size-5 text-primary group-hover:text-emerald-500" />
					</div>
					<div>
						<CardTitle className="text-lg text-foreground">
							{account.description}
						</CardTitle>
						<p className="text-xs text-muted-foreground">
							{account.stocks?.length || 0} stocks
						</p>
					</div>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="text-muted-foreground"
						>
							<MoreVertical className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="bg-popover border-border">
						<DropdownMenuItem
							onClick={() => {
								setIsBuyOpen(true);
							}}
							className="cursor-pointer"
						>
							<ShoppingCart className="mr-2 size-4" />
							Buy stock
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setIsSellOpen(true);
							}}
							disabled={!hasStocks}
							className="cursor-pointer"
						>
							<DollarSign className="mr-2 size-4" />
							Sell stock
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setIsDetailsOpen(true);
							}}
							className="cursor-pointer"
						>
							<Eye className="mr-2 size-4" />
							View Details
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setIsDeleteDialogOpen(true);
							}}
							disabled={hasStocks || isDeletingAccount}
							className="text-destructive focus:text-destructive cursor-pointer"
						>
							{isDeletingAccount ? (
								<LoaderCircle className="mr-2 size-4 animate-spin" />
							) : (
								<Trash2 className="mr-2 size-4" />
							)}
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
					<DialogContent className="sm:max-w-md" showCloseButton={false}>
						<DialogHeader>
							<DialogTitle>Delete account?</DialogTitle>
							<DialogDescription>
								This action cannot be undone. This account will be permanently
								removed.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline" disabled={isDeletingAccount}>
									Cancel
								</Button>
							</DialogClose>
							<Button
								type="button"
								variant="destructive"
								onClick={handleDeleteAccount}
								disabled={isDeletingAccount || hasStocks}
								className="md:w-48"
							>
								{isDeletingAccount ? (
									<LoaderCircle className="animate-spin size-5" />
								) : (
									'Delete permanently'
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
				<AccountDetailsModal
					account={account}
					open={isDetailsOpen}
					onOpenChange={setIsDetailsOpen}
				/>
				<BuyStockModal
					accounts={[account]}
					defaultAccountId={account.accountId}
					open={isBuyOpen}
					onOpenChange={setIsBuyOpen}
				/>
				<SellStockModal
					account={account}
					open={isSellOpen}
					onOpenChange={setIsSellOpen}
				/>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-end justify-between">
					<div>
						{totalValue && (
							<p className="text-3xl font-bold text-foreground">
								{totalValue?.equals(new Decimal(0)) ? (
									formatCurrency(totalValue)
								) : (
									<>
										$
										<CountUp
											from={0}
											to={Number(totalValue.toNumber().toFixed(2))}
											direction="up"
											duration={0.1}
											separator=","
											className="count-up-text"
										/>
									</>
								)}
							</p>
						)}
						{/* <div className="flex items-center gap-2 mt-1">
							{account.change >= 0 ? (
								<TrendingUp className="size-4 text-success" />
							) : (
								<TrendingDown className="size-4 text-destructive" />
							)}
							<span
								className={`text-sm font-medium ${
									account.change >= 0 ? 'text-success' : 'text-destructive'
								}`}
							>
								{account.change >= 0 ? '+' : ''}
								{account.changePercent.toFixed(2)}%
							</span>
							<span className="text-sm text-muted-foreground">
								(${Math.abs(account.change).toLocaleString()})
							</span>
						</div> */}
					</div>
				</div>

				{/* Stock Holdings Preview */}
				{account.stocks && account.stocks.length > 0 && (
					<div className="space-y-2">
						<p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
							Top Holdings
						</p>
						<div className="flex flex-wrap gap-2">
							{account.stocks.slice(0, 4).map(stock => (
								// <Badge
								// 	key={stock.stockId}
								// 	variant="secondary"
								// 	className="bg-secondary text-secondary-foreground"
								// >
								// 	{stock.stockId}
								// </Badge>
								<StockLogo
									key={stock.stockId}
									src={stock.logoUrl}
									stockId={stock.stockId}
								/>
							))}
							{account.stocks.length > 4 && (
								<Badge
									variant="secondary"
									className="bg-secondary text-secondary-foreground"
								>
									+{account.stocks.length - 4} more
								</Badge>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
