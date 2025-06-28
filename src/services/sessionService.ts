import { supabase } from '../lib/supabaseClient';
import { projectService } from './projectService';

// Types for session service
export interface SessionDetails {
  pomodoros_completed: number;
  total_focused_minutes: number;
  start_time: Date;
  end_time: Date;
  notes?: string;
}

export interface SubTaskUpdate {
  id: string;
  is_completed: boolean;
  title?: string;
  action?: string;
  details?: string;
  estimated_minutes_per_sub_task?: number | null;
}

export interface WorkSession {
  id: string;
  project_id: string;
  user_id: string;
  pomodoros_completed: number;
  total_focused_minutes: number;
  start_time: string;
  end_time: string;
  notes?: string;
  created_at: string;
}

class SessionService {
  /**
   * Save session progress including sub-task updates and session metrics
   */
  async saveSessionProgress(
    projectId: string,
    updatedSubTasks: SubTaskUpdate[],
    sessionDetails: SessionDetails,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🚀 Saving session progress:', {
        projectId,
        subTaskUpdates: updatedSubTasks.length,
        pomodorosCompleted: sessionDetails.pomodoros_completed,
        focusedMinutes: sessionDetails.total_focused_minutes,
        userId: userId.substring(0, 8) + '...'
      });

      // 1. Update sub-task completion statuses
      if (updatedSubTasks.length > 0) {
        const { success: subTaskSuccess, error: subTaskError } = await projectService.batchUpdateSubTaskCompletion(
          updatedSubTasks,
          userId
        );

        if (!subTaskSuccess) {
          throw new Error(`Failed to update sub-tasks: ${subTaskError}`);
        }

        console.log('✅ Sub-tasks updated successfully');
      }

      // 2. Save work session record
      const { data: session, error: sessionError } = await supabase
        .from('work_sessions')
        .insert({
          project_id: projectId,
          user_id: userId,
          pomodoros_completed: sessionDetails.pomodoros_completed,
          total_focused_minutes: sessionDetails.total_focused_minutes,
          start_time: sessionDetails.start_time.toISOString(),
          end_time: sessionDetails.end_time.toISOString(),
          notes: sessionDetails.notes
        })
        .select()
        .single();

      if (sessionError) {
        console.error('❌ Error creating work session:', sessionError);
        throw new Error(`Failed to save work session: ${sessionError.message}`);
      }

      console.log('✅ Work session saved successfully:', {
        sessionId: session.id,
        duration: sessionDetails.total_focused_minutes
      });

      // 3. Check and update project completion status
      await projectService.checkAndUpdateProjectCompletion(projectId, userId);

      return { success: true };

    } catch (error) {
      console.error('❌ Error in saveSessionProgress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get work sessions for a project
   */
  async getProjectSessions(
    projectId: string,
    userId: string
  ): Promise<{ sessions: WorkSession[]; success: boolean; error?: string }> {
    try {
      console.log('📋 Fetching sessions for project:', projectId);

      const { data: sessions, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('❌ Error fetching sessions:', error);
        throw new Error(`Failed to fetch sessions: ${error.message}`);
      }

      console.log('✅ Sessions fetched successfully:', {
        count: sessions?.length || 0
      });

      return {
        sessions: sessions || [],
        success: true
      };

    } catch (error) {
      console.error('❌ Error in getProjectSessions:', error);
      return {
        sessions: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's work session history
   */
  async getUserSessions(
    userId: string,
    limit?: number
  ): Promise<{ sessions: WorkSession[]; success: boolean; error?: string }> {
    try {
      console.log('📋 Fetching user sessions:', userId.substring(0, 8) + '...');

      let query = supabase
        .from('work_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data: sessions, error } = await query;

      if (error) {
        console.error('❌ Error fetching user sessions:', error);
        throw new Error(`Failed to fetch user sessions: ${error.message}`);
      }

      console.log('✅ User sessions fetched successfully:', {
        count: sessions?.length || 0
      });

      return {
        sessions: sessions || [],
        success: true
      };

    } catch (error) {
      console.error('❌ Error in getUserSessions:', error);
      return {
        sessions: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Calculate session statistics for a project
   */
  async getProjectStatistics(
    projectId: string,
    userId: string
  ): Promise<{
    statistics: {
      totalSessions: number;
      totalPomodoros: number;
      totalFocusedMinutes: number;
      averageSessionLength: number;
      lastSessionDate?: string;
    };
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('📊 Calculating project statistics:', projectId);

      const { sessions, success, error } = await this.getProjectSessions(projectId, userId);

      if (!success) {
        throw new Error(error);
      }

      const totalSessions = sessions.length;
      const totalPomodoros = sessions.reduce((sum, session) => sum + session.pomodoros_completed, 0);
      const totalFocusedMinutes = sessions.reduce((sum, session) => sum + session.total_focused_minutes, 0);
      const averageSessionLength = totalSessions > 0 ? Math.round(totalFocusedMinutes / totalSessions) : 0;
      const lastSessionDate = sessions.length > 0 ? sessions[0].start_time : undefined;

      const statistics = {
        totalSessions,
        totalPomodoros,
        totalFocusedMinutes,
        averageSessionLength,
        lastSessionDate
      };

      console.log('✅ Project statistics calculated:', statistics);

      return {
        statistics,
        success: true
      };

    } catch (error) {
      console.error('❌ Error in getProjectStatistics:', error);
      return {
        statistics: {
          totalSessions: 0,
          totalPomodoros: 0,
          totalFocusedMinutes: 0,
          averageSessionLength: 0
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Best-effort session save for interruptions
   */
  async saveInterruptedSession(
    projectId: string,
    updatedSubTasks: SubTaskUpdate[],
    partialSessionDetails: Omit<SessionDetails, 'end_time'>,
    userId: string
  ): Promise<void> {
    try {
      console.log('⚠️ Saving interrupted session (best effort)');

      const sessionDetails: SessionDetails = {
        ...partialSessionDetails,
        end_time: new Date() // Use current time as end time
      };

      // Use the regular save method but don't throw on errors
      const result = await this.saveSessionProgress(
        projectId,
        updatedSubTasks,
        sessionDetails,
        userId
      );

      if (result.success) {
        console.log('✅ Interrupted session saved successfully');
      } else {
        console.warn('⚠️ Failed to save interrupted session:', result.error);
      }

    } catch (error) {
      console.warn('⚠️ Best-effort save failed:', error);
      // Don't throw - this is a best-effort operation
    }
  }
}

export const sessionService = new SessionService();