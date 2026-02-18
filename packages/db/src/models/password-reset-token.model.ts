import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface PasswordResetTokenAttributes {
  id: number;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface PasswordResetTokenCreationAttributes
  extends Optional<PasswordResetTokenAttributes, 'id' | 'used_at' | 'created_at'> {}

export class PasswordResetToken
  extends Model<PasswordResetTokenAttributes, PasswordResetTokenCreationAttributes>
  implements PasswordResetTokenAttributes
{
  declare id: number;
  declare user_id: string;
  declare token_hash: string;
  declare expires_at: Date;
  declare used_at: Date | null;
  declare created_at: Date;
}

PasswordResetToken.init(
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
    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'password_reset_tokens',
    modelName: 'PasswordResetToken',
    timestamps: false,
    underscored: true,
  },
);
