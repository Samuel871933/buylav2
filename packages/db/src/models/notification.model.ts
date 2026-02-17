import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface NotificationAttributes {
  id: number;
  user_id: string;
  type: 'sale' | 'referral' | 'tier_up' | 'cashback_earned' | 'payout';
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

export interface NotificationCreationAttributes
  extends Optional<NotificationAttributes, 'id' | 'is_read' | 'created_at'> {}

export class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  declare id: number;
  declare user_id: string;
  declare type: 'sale' | 'referral' | 'tier_up' | 'cashback_earned' | 'payout';
  declare title: string;
  declare message: string;
  declare is_read: boolean;
  declare created_at: Date;
}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    type: {
      type: DataTypes.ENUM('sale', 'referral', 'tier_up', 'cashback_earned', 'payout'),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'notifications',
    modelName: 'Notification',
    timestamps: false,
    underscored: true,
  },
);
