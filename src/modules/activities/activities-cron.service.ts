import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { NotificationService } from '../achievements/services/notification.service';
import { NotificationType } from '../achievements/schemas/notification.schema';

@Injectable()
export class ActivitiesCronService {
  private readonly logger = new Logger(ActivitiesCronService.name);

  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    private notificationService: NotificationService,
  ) {}

  /**
   * Vérifier toutes les minutes si des activités sont passées
   * et les marquer comme terminées + envoyer les notifications
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndCompletePastActivities() {
    try {
      const now = new Date();
      this.logger.debug(
        `[ActivitiesCronService] Checking for past activities at ${now.toISOString()}`,
      );

      // Trouver toutes les activités non terminées dont la date/heure est passée
      // On compare le champ 'time' qui contient la date et l'heure combinées
      const pastActivities = await this.activityModel
        .find({
          isCompleted: { $ne: true },
          time: { $lt: now }, // time est un Date qui contient date + heure
        })
        .populate('creator', 'name')
        .exec();

      if (pastActivities.length === 0) {
        this.logger.debug('[ActivitiesCronService] No past activities found');
        return;
      }

      this.logger.log(
        `[ActivitiesCronService] Found ${pastActivities.length} past activities to complete`,
      );

      for (const activity of pastActivities) {
        try {
          // Marquer l'activité comme terminée
          activity.isCompleted = true;
          await activity.save();

          this.logger.log(
            `[ActivitiesCronService] Activity ${activity._id} (${activity.title}) marked as completed`,
          );

          // Envoyer des notifications de review à tous les participants (sauf le créateur)
          const participants = activity.participantIds || [];
          const creatorId = activity.creator.toString();
          const participantsToNotify = participants.filter(
            (p: any) => p.toString() !== creatorId,
          );

          if (participantsToNotify.length === 0) {
            this.logger.debug(
              `[ActivitiesCronService] No participants to notify for activity ${activity._id}`,
            );
            continue;
          }

          this.logger.log(
            `[ActivitiesCronService] Sending review notifications to ${participantsToNotify.length} participants for activity ${activity._id}`,
          );

          // Créer les notifications pour chaque participant
          for (const participantId of participantsToNotify) {
            try {
              await this.notificationService.createNotification(
                participantId.toString(),
                NotificationType.ACTIVITY_REVIEW_REQUEST,
                'Rate Your Session',
                `How was your last coach session "${activity.title}"? Tap to leave a rating and review.`,
                {
                  activityId: activity._id.toString(),
                  activityName: activity.title,
                  activityTitle: activity.title,
                },
              );
              this.logger.debug(
                `[ActivitiesCronService] Review notification sent to participant ${participantId} for activity ${activity._id}`,
              );
            } catch (error) {
              this.logger.error(
                `[ActivitiesCronService] Error sending review notification to participant ${participantId} for activity ${activity._id}: ${error.message}`,
              );
              // Continuer avec les autres participants même si une notification échoue
            }
          }
        } catch (error) {
          this.logger.error(
            `[ActivitiesCronService] Error processing activity ${activity._id}: ${error.message}`,
            error.stack,
          );
          // Continuer avec les autres activités même si une échoue
        }
      }

      this.logger.log(
        `[ActivitiesCronService] Completed processing ${pastActivities.length} past activities`,
      );
    } catch (error) {
      this.logger.error(
        `[ActivitiesCronService] Error in checkAndCompletePastActivities: ${error.message}`,
        error.stack,
      );
    }
  }
}

