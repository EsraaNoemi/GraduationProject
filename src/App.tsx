import { useCallback, useState } from 'react';
import { OperationsAssistantDrawer } from './components/assistant/OperationsAssistantDrawer.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import { ApprovalsAuditView } from './components/views/ApprovalsAuditView.tsx';
import { InventoryLocationsView } from './components/views/InventoryLocationsView.tsx';
import { OrdersFeasibilityView } from './components/views/OrdersFeasibilityView.tsx';
import { OverviewDashboard, type NavTabId } from './components/views/OverviewDashboard.tsx';
import { StockTransfersView } from './components/views/StockTransfersView.tsx';
import { useOperationsStore } from './hooks/useOperationsStore.ts';
import { useTheme } from './hooks/useTheme.ts';
import type { UserRole } from './types/domain.ts';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('EMPLOYEE');

  const { theme, setTheme } = useTheme();
  const store = useOperationsStore(selectedLocationId, activeRole);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        locations={store.opsState.locations}
        selectedLocationId={selectedLocationId}
        onSelectLocation={setSelectedLocationId}
        users={store.opsState.users}
        activeUser={store.activeUser}
        onSwitchRole={setActiveRole}
        theme={theme}
        onChangeTheme={setTheme}
        navCounts={store.navCounts}
        assistantOpen={store.assistantOpen}
        onToggleAssistant={store.toggleAssistant}
        onSimulateStockDrift={store.handleSimulateStockDrift}
        onResetDemoState={store.handleResetDemoState}
        driftNotice={store.driftNotice}
        onDismissDriftNotice={store.dismissDriftNotice}
      >
        {activeTab === 'overview' ? (
          <OverviewDashboard
            state={store.opsState}
            selectedLocationId={selectedLocationId}
            activeRole={activeRole}
            onNavigate={setActiveTab}
            onOpenAssistant={store.openAssistant}
          />
        ) : null}

        {activeTab === 'orders' ? (
          <OrdersFeasibilityView
            state={store.opsState}
            selectedLocationId={selectedLocationId}
            onAnalyzeWithAssistant={store.analyzeWithAssistant}
          />
        ) : null}

        {activeTab === 'inventory' ? (
          <InventoryLocationsView
            state={store.opsState}
            selectedLocationId={selectedLocationId}
            actorUserId={store.activeUser.id}
            onAdjustStock={store.handleAdjustStock}
            onUpsertProduct={store.handleUpsertProduct}
          />
        ) : null}

        {activeTab === 'transfers' ? (
          <StockTransfersView
            state={store.opsState}
            selectedLocationId={selectedLocationId}
            activeRole={activeRole}
            actorUserId={store.activeUser.id}
            feedback={store.transferFeedback}
            onDismissFeedback={store.dismissTransferFeedback}
            onAdvanceStatus={store.handleAdvanceTransferStatus}
            onCreateTransfer={store.handleCreateTransfer}
          />
        ) : null}

        {activeTab === 'approvals' ? (
          <ApprovalsAuditView
            state={store.opsState}
            selectedLocationId={selectedLocationId}
            activeRole={activeRole}
            feedback={store.approvalFeedback}
            onDismissFeedback={store.dismissApprovalFeedback}
            onSimulateStockDrift={store.handleSimulateStockDrift}
            onUpdateDraftQty={store.handleUpdateDraftQty}
            onVerifyDraft={store.handleVerifyDraft}
            onRefreshSnapshot={store.handleRefreshDraftSnapshot}
            onSubmitDecision={store.handleSubmitDecision}
          />
        ) : null}
      </AppShell>

      <OperationsAssistantDrawer
        open={store.assistantOpen}
        onClose={store.closeAssistant}
        state={store.opsState}
        activeUser={store.activeUser}
        selectedLocationId={selectedLocationId}
        activeRunId={store.activeRunId}
        onSelectRunId={store.setActiveRunId}
        runSequenceNumber={store.runSequenceNumber}
        ambiguityCandidates={store.ambiguityCandidates}
        missingQuantityProduct={store.missingQuantityProduct}
        lastAgentPrompt={store.lastAgentPrompt}
        feedback={store.approvalFeedback}
        onDismissFeedback={store.dismissApprovalFeedback}
        onRunAgentCommand={store.runAgentCommand}
        onRunStaleConflictTest={store.handleRunStaleConflictScenario}
        onUpdateDraftQty={store.handleUpdateDraftQty}
        onVerifyDraft={store.handleVerifyDraft}
        onRefreshSnapshot={store.handleRefreshDraftSnapshot}
        onSubmitDecision={store.handleSubmitDecision}
      />
    </>
  );
}

export default App;
