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

      // ✅ CORRIGER : Récupérer toutes les activités non complétées
      // et vérifier manuellement si elles sont passées
      const activities = await this.activityModel
        .find({
          isCompleted: { $ne: true },
        })
        .populate('creator', 'name')
        .exec();

      this.logger.debug(
        `[ActivitiesCronService] Found ${activities.length} non-completed activities to check`,
      );

      if (activities.length === 0) {
        this.logger.debug('[ActivitiesCronService] No non-completed activities found');
        return;
      }

      // Filtrer les activités passées
      const pastActivities: ActivityDocument[] = [];

      for (const activity of activities) {
        try {
          // ✅ Utiliser directement le champ 'time' qui contient déjà la date complète (ISO 8601)
          let activityDateTime: Date | null = null;

          // Priorité 1: Utiliser le champ 'time' qui contient date + heure complète
          if (activity.time) {
            activityDateTime = activity.time instanceof Date
              ? activity.time
              : new Date(activity.time);
            
            this.logger.debug(
              `[ActivitiesCronService] Activity ${activity._id} (${activity.title}): time=${activity.time instanceof Date ? activity.time.toISOString() : String(activity.time)}, parsed=${activityDateTime.toISOString()}`,
            );
          }
          // Priorité 2: Utiliser le champ 'date' et supposer minuit
          else if (activity.date) {
            activityDateTime = activity.date instanceof Date
              ? activity.date
              : new Date(activity.date);
            
            this.logger.debug(
              `[ActivitiesCronService] Activity ${activity._id} (${activity.title}): date=${activity.date instanceof Date ? activity.date.toISOString() : String(activity.date)}, parsed=${activityDateTime.toISOString()}`,
            );
          }

          // Si on n'a ni date ni time, ignorer cette activité
          if (!activityDateTime) {
            this.logger.warn(
              `[ActivitiesCronService] Activity ${activity._id} (${activity.title}) has no date/time, skipping`,
            );
            continue;
          }

          // Vérifier si l'activité est passée
          const isPast = activityDateTime < now;
          
          this.logger.debug(
            `[ActivitiesCronService] Activity ${activity._id} (${activity.title}): activityDateTime=${activityDateTime.toISOString()}, now=${now.toISOString()}, isPast=${isPast}`,
          );

          if (isPast) {
            pastActivities.push(activity);
            this.logger.log(
              `[ActivitiesCronService] ✅ Activity ${activity._id} (${activity.title}) is past (${activityDateTime.toISOString()}), will be marked as completed`,
            );
          }
        } catch (error) {
          this.logger.error(
            `[ActivitiesCronService] Error checking activity ${activity._id}: ${error.message}`,
            error.stack,
          );
          continue;
        }
      }

      if (pastActivities.length === 0) {
        this.logger.debug(
          `[ActivitiesCronService] No past activities found (checked ${activities.length} activities)`,
        );
        return;
      }

      this.logger.log(
        `[ActivitiesCronService] Found ${pastActivities.length} past activities to complete (out of ${activities.length} checked)`,
      );

      for (const activity of pastActivities) {
        try {
          // Marquer l'activité comme terminée
          activity.isCompleted = true;
          await activity.save();

          this.logger.log(
            `[ActivitiesCronService] Activity ${activity._id} (${activity.title}) marked as completed`,
          );

          // Envoyer des notifications de review UNIQUEMENT pour les activités coach (avec price > 0)
          // Les activités individuelles (gratuites) ne nécessitent pas de review
          if (activity.price && activity.price > 0) {
            const participants = activity.participantIds || [];
            
            // Gérer le creatorId (peut être un ObjectId ou un objet populé)
            let creatorId: string;
            if (typeof activity.creator === 'object' && activity.creator !== null) {
              creatorId = activity.creator._id
                ? activity.creator._id.toString()
                : activity.creator.toString();
            } else {
              creatorId = activity.creator.toString();
            }
            
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
              `[ActivitiesCronService] Sending review notifications to ${participantsToNotify.length} participants for coach session (price: ${activity.price}) activity ${activity._id}`,
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
          } else {
            this.logger.debug(
              `[ActivitiesCronService] Activity ${activity._id} is free (no price), skipping review notifications`,
            );
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

