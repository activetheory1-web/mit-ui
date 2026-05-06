import { DefaultAzureCredential } from '@azure/identity';
import axios from 'axios';

export class PipelineSyncService {
  /**
   * Triggers a Microsoft Fabric Data Factory pipeline using the Fabric REST API.
   * Authentication is handled via Azure Service Principal.
   */
  async triggerFabricPipeline(workspaceId: string, pipelineId: string): Promise<void> {
    try {
      if (!workspaceId || !pipelineId) {
        console.warn('Skipping Fabric Pipeline Trigger: Missing workspaceId or pipelineId');
        return;
      }

      console.log('Skipping Fabric Pipeline Trigger for now as Azure AD is not needed for the time being.');
      return;

      console.log(`Triggering Fabric Pipeline ${pipelineId} in workspace ${workspaceId}`);

      const credential = new DefaultAzureCredential();
      // Fabric REST API resource scope
      const token = await credential.getToken('https://api.fabric.microsoft.com/.default');

      await axios.post(
        `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/items/${pipelineId}/jobs/instances`,
        { executionData: {} },
        {
          headers: {
            Authorization: `Bearer ${token.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Successfully triggered Fabric Pipeline');
    } catch (error: any) {
      console.error('Failed to trigger Fabric Pipeline:', error?.response?.data || error);
      // We don't throw here to avoid failing the OAuth connection flow if just the pipeline trigger fails.
    }
  }
}

export default new PipelineSyncService();
