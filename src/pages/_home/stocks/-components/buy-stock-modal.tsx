import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
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
	DialogTrigger,
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
	useBuyStock,
} from '@/http/requests/trades';
import { getListAllAccountsQueryKey } from '@/http/requests/users';
import type { AccountResponseDto, ErrorResponseDto } from '@/http/schemas';
import { useAuth } from '@/integrations/tanstack-store/stores/auth.store';
import { formatCurrency } from '@/utils/formatters';
import {
	type BuyStockSchema,
	buyStockSchema,
} from '../-schemas/buy-stock.schema';

const formDefaultValues: BuyStockSchema = {
	stockId: '',
	quantity: 1,
	accountId: '',
};

interface BuyStockModalProps {
	accounts: AccountResponseDto[];
	defaultAccountId?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
}

export function BuyStockModal({
	accounts,
	defaultAccountId,
	open: controlledOpen,
	onOpenChange,
	trigger,
}: BuyStockModalProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const [selectedAccountId, setSelectedAccountId] = useState(
		defaultAccountId ?? ''
	);
	const [selectedStockId, setSelectedStockId] = useState('');
	const [selectedQuantity, setSelectedQuantity] = useState(
		formDefaultValues.quantity
	);
	const isControlled = controlledOpen !== undefined;
	const open = isControlled ? controlledOpen : internalOpen;
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const userId = user?.userId;

	const selectedStock = useMemo(() => {
		const normalizedStockId = selectedStockId.trim().toUpperCase();

		if (!normalizedStockId) {
			return undefined;
		}

		const selectedAccount = accounts.find(
			account => account.accountId === selectedAccountId
		);

		if (selectedAccount) {
			return selectedAccount.stocks.find(
				stock => stock.stockId === normalizedStockId
			);
		}

		for (const account of accounts) {
			const foundStock = account.stocks.find(
				stock => stock.stockId === normalizedStockId
			);

			if (foundStock) {
				return foundStock;
			}
		}

		return undefined;
	}, [accounts, selectedAccountId, selectedStockId]);

	const estimatedTotal = useMemo(() => {
		if (!selectedStock || selectedQuantity <= 0) {
			return undefined;
		}

		return new Decimal(selectedStock.currentPrice).mul(selectedQuantity);
	}, [selectedQuantity, selectedStock]);

	const { mutate: buyStock, isPending: isBuyingStock } =
		useBuyStock<ErrorResponseDto>({
			mutation: {
				onSuccess: () => {
					toast.success('Stock bought successfully');
					form.reset();
					handleOpenChange(false);

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
					toast.error('Error buying stock', { description });
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
			buyStock({
				data: {
					...parsed,
				},
			});
		},
	});

	const handleOpenChange = (isOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(isOpen);
		}

		onOpenChange?.(isOpen);

		if (!isOpen) {
			form.reset();
			setSelectedStockId('');
			setSelectedQuantity(formDefaultValues.quantity);
			setSelectedAccountId(defaultAccountId ?? '');
		}
	};

	useEffect(() => {
		if (open && defaultAccountId) {
			form.setFieldValue('accountId', defaultAccountId);
			setSelectedAccountId(defaultAccountId);
		}
	}, [defaultAccountId, form, open]);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger ? (
				<DialogTrigger asChild>{trigger}</DialogTrigger>
			) : !isControlled ? (
				<DialogTrigger asChild>
					<Button variant="primary">Buy stock</Button>
				</DialogTrigger>
			) : null}
			<DialogContent className="sm:max-w-sm">
				<form
					id="buy-stock-form"
					onSubmit={e => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<DialogHeader>
						<DialogTitle>Buy stock</DialogTitle>
						<DialogDescription>
							Buy a stock to add it to your portfolio.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup className="gap-4 mt-2">
						<form.Field name="accountId">
							{field => {
								const isInvalid =
									field.state.meta.isTouched &&
									field.state.meta.errors.length > 0;
								return (
									<Field className="grid gap-2" data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Account</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={value => {
												setSelectedAccountId(value);
												field.handleChange(value);
											}}
											disabled={isBuyingStock}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select an account" />
											</SelectTrigger>
											<SelectContent>
												{accounts.map((account: AccountResponseDto) => (
													<SelectItem
														key={account.accountId}
														value={account.accountId}
													>
														{account.description}
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
						<form.Field name="stockId">
							{field => {
								const isInvalid =
									field.state.meta.isTouched &&
									field.state.meta.errors.length > 0;
								return (
									<Field className="grid gap-2" data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Stock</FieldLabel>
										<Input
											id={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={e => {
												const value = e.target.value.toUpperCase();
												setSelectedStockId(value);
												field.handleChange(value);
											}}
											placeholder="AAPL"
											disabled={isBuyingStock}
										/>
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
											placeholder="67"
											disabled={isBuyingStock}
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>
						{selectedStock ? (
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
						) : (
							selectedStockId.trim().length > 0 && (
								<p className="text-xs text-muted-foreground">
									Unable to preview this ticker price.
								</p>
							)
						)}
					</FieldGroup>
					<DialogFooter className="mt-2">
						<DialogClose asChild>
							<Button variant="outline" disabled={isBuyingStock}>
								Cancel
							</Button>
						</DialogClose>
						<Button
							type="submit"
							variant="primary"
							className="wfull sm:w-34 font-medium"
							disabled={isBuyingStock}
						>
							{isBuyingStock ? (
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
