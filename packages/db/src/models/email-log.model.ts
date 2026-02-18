import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface EmailLogAttributes {
  id: number;
  user_id: string | null;
  template_name: string;
  to_email: string;
  subject: string;
  status: 'sent' | 'failed' | 'bounced';
  resend_id: string | null;
  sent_at: Date;
}

export interface EmailLogCreationAttributes
  extends Optional<
    EmailLogAttributes,
    'id' | 'user_id' | 'status' | 'resend_id' | 'sent_at'
  > {}

export class EmailLog
  extends Model<EmailLogAttributes, EmailLogCreationAttributes>
  implements EmailLogAttributes
{
  declare id: number;
  declare user_id: string | null;
  declare template_name: string;
  declare to_email: string;
  declare subject: string;
  declare status: 'sent' | 'failed' | 'bounced';
  declare resend_id: string | null;
  declare sent_at: Date;
}

EmailLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    template_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    to_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('sent', 'failed', 'bounced'),
      allowNull: false,
      defaultValue: 'sent',
    },
    resend_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'email_logs',
    modelName: 'EmailLog',
    timestamps: false,
    underscored: true,
  },
);
