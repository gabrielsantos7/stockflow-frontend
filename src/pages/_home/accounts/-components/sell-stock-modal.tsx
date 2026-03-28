import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { getGetOwnedStocksQueryKey } from '@/http/requests/stocks';
import {
	getGetTransactionHistoryQueryKey,
	useSellStock,
} from '@/http/requests/trades';
import { getListAllAccountsQueryKey } from '@/http/requests/users';
import type { AccountResponseDto } from '@/http/schemas';
import { useAuth } from '@/integrations/tanstack-store/stores/auth.store';
import { formatCurrency } from '@/utils/formatters';
import {
	type BuyStockSchema,
	buyStockSchema,
} from '../../stocks/-schemas/buy-stock.schema';

type SellStockModalProps = {
	account: AccountResponseDto;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const formDefaultValues: BuyStockSchema = {
	stockId: '',
	quantity: 1,
	accountId: '',
};

export function SellStockModal({
	account,
	open,
	onOpenChange,
}: SellStockModalProps) {
	const availableStocks = useMemo(() => account.stocks ?? [], [account.stocks]);
	const [selectedStockId, setSelectedStockId] = useState('');
	const [selectedQuantity, setSelectedQuantity] = useState(
		formDefaultValues.quantity
	);

	const selectedStock = useMemo(
		() =>
			availableStocks.find(
				stock => stock.stockId === selectedStockId.trim().toUpperCase()
			),
		[availableStocks, selectedStockId]
	);

	const estimatedTotal = useMemo(() => {
		if (!selectedStock || selectedQuantity <= 0) {
			return undefined;
		}

		return new Decimal(selectedStock.currentPrice).mul(selectedQuantity);
	}, [selectedQuantity, selectedStock]);

	const queryClient = useQueryClient();
	const { user } = useAuth();
	const userId = user?.userId;

	const { mutate: sellStock, isPending: isSellingStock } = useSellStock({
		mutation: {
			onSuccess: () => {
				toast.success('Stock sold successfully');
				form.reset();
				onOpenChange(false);

				queryClient.invalidateQueries({
					queryKey: getGetOwnedStocksQueryKey(),
				});

				if (userId) {
					queryClient.invalidateQueries({
						queryKey: getListAllAccountsQueryKey(userId),
					});
				}

				queryClient.invalidateQueries({
					queryKey: getGetTransactionHistoryQueryKey(),
				});
			},
			onError: error => {
				const description = error.message || 'An unexpected error occurred';
				toast.error('Error selling stock', { description });
			},
		},
	});

	const form = useForm({
		defaultValues: formDefaultValues,
		validators: {
			onSubmit: buyStockSchema,
		},
		onSubmit: ({ value }) => {
			const parsed = buyStockSchema.safeParse(value).data as BuyStockSchema;

			const selectedStock = availableStocks.find(
				stock => stock.stockId === parsed.stockId
			);

			if (!selectedStock) {
				toast.error('Stock not found in this account');
				return;
			}

			if (parsed.quantity > selectedStock.quantity) {
				toast.error('Quantity is greater than available shares');
				return;
			}

			sellStock({
				data: {
					stockId: parsed.stockId,
					accountId: parsed.accountId,
					quantity: parsed.quantity,
				},
			});
		},
	});

	useEffect(() => {
		if (open) {
			form.setFieldValue('accountId', account.accountId);
			setSelectedStockId('');
			setSelectedQuantity(formDefaultValues.quantity);
		}
	}, [account.accountId, form, open]);

	return (
		<Dialog
			open={open}
			onOpenChange={isOpen => {
				onOpenChange(isOpen);

				if (!isOpen) {
					form.reset();
					setSelectedStockId('');
					setSelectedQuantity(formDefaultValues.quantity);
				}
			}}
		>
			<DialogContent className="sm:max-w-sm">
				<form
					id="sell-stock-form"
					onSubmit={e => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<DialogHeader>
						<DialogTitle>Sell stock</DialogTitle>
						<DialogDescription>
							Select one stock from this account and inform quantity.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup className="gap-4 mt-2">
						<form.Field name="stockId">
							{field => {
								const isInvalid =
									field.state.meta.isTouched &&
									field.state.meta.errors.length > 0;
								return (
									<Field className="grid gap-2" data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Stock</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={value => {
												setSelectedStockId(value);
												field.handleChange(value);
											}}
											disabled={isSellingStock}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select a stock" />
											</SelectTrigger>
											<SelectContent>
												{availableStocks.map(stock => (
													<SelectItem key={stock.stockId} value={stock.stockId}>
														{stock.stockId} ({stock.quantity})
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						<form.Field name="quantity">
							{field => {
								const isInvalid =
									field.state.meta.isTouched &&
									field.state.meta.errors.length > 0;
								return (
									<Field className="grid gap-2" data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Quantity</FieldLabel>
										<Input
											id={field.name}
											type="number"
											step={1}
											min={1}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={e => {
												const nextQuantity = Number(e.target.value);
												setSelectedQuantity(nextQuantity);
												field.handleChange(nextQuantity);
											}}
											placeholder="100"
											disabled={isSellingStock}
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>
						{selectedStock && (
							<div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
								<p className="text-muted-foreground">
									Current price ({selectedStock.stockId}):{' '}
									<span className="font-medium text-foreground">
										{formatCurrency(new Decimal(selectedStock.currentPrice))}
									</span>
								</p>
								{estimatedTotal && (
									<p className="text-muted-foreground mt-1">
										Estimated total:{' '}
										<span className="font-medium text-foreground">
											{formatCurrency(estimatedTotal)}
										</span>
									</p>
								)}
							</div>
						)}
					</FieldGroup>
					<DialogFooter className="mt-2">
						<DialogClose asChild>
							<Button variant="outline" disabled={isSellingStock}>
								Cancel
							</Button>
						</DialogClose>
						<Button
							type="submit"
							variant="primary"
							className="w-full sm:w-34 font-medium"
							disabled={isSellingStock}
						>
							{isSellingStock ? (
								<LoaderCircle className="animate-spin size-6" strokeWidth={3} />
							) : (
								'Save changes'
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
