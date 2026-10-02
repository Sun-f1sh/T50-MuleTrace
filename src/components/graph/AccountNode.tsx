"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { Account } from "@shared/types";
import { RiskDot } from "@/components/ui/StatusDot";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export type AccountNodeData = {
  account: Account;
  isFocus: boolean;
  dimmed: boolean;
};

export type AccountFlowNode = Node<AccountNodeData, "account">;

export const AccountNode = memo(function AccountNode({
  data,
  selected,
}: NodeProps<AccountFlowNode>) {
  const { account, isFocus, dimmed } = data;

  return (
    <div
      style={{ width: 224 }}
      className={cn(
        "rounded-lg border bg-surface px-3.5 py-3 transition-opacity duration-200",
        isFocus ? "border-celery" : "border-line",
        selected && "border-mint shadow-[0_0_0_1px_var(--mint)]",
        dimmed && "opacity-30",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="flex items-center gap-2">
        <RiskDot level={account.riskLevel} />
        <span className="truncate font-mono text-[12px] font-medium text-ink">{account.id}</span>
        {isFocus && (
          <span className="ml-auto rounded-full bg-celery px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-aurora">
            Subject
          </span>
        )}
      </div>

      {account.label && (
        <p className="mt-1 truncate text-[12px] font-semibold tracking-[-0.01em] text-ink">
          {account.label}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between font-mono text-[10.5px] text-faint tnum">
        <span>{account.transactionCount} tx</span>
        <span>in {formatCurrency(account.totalInflow, account.currency, { compact: true })}</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between font-mono text-[10.5px] text-faint tnum">
        <span className="uppercase tracking-[0.1em]">{account.riskLevel}</span>
        <span>out {formatCurrency(account.totalOutflow, account.currency, { compact: true })}</span>
      </div>
    </div>
  );
});
