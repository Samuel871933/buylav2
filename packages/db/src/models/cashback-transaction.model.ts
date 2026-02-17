import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface CashbackTransactionAttributes {
  id: number;
  user_id: string;
  conversion_id: number | null;
  type: 'earned' | 'withdrawal' | 'clawback' | 'adjustment';
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: Date;
}

export interface CashbackTransactionCreationAttributes
  extends Optional<
    CashbackTransactionAttributes,
    | 'id'
    | 'conversion_id'
    | 'description'
    | 'created_at'
  > {}

export class CashbackTransaction
  extends Model<CashbackTransactionAttributes, CashbackTransactionCreationAttributes>
  implements CashbackTransactionAttributes
{
  declare id: number;
  declare user_id: string;
  declare conversion_id: number | null;
  declare type: 'earned' | 'withdrawal' | 'clawback' | 'adjustment';
  declare amount: number;
  declare balance_after: number;
  declare description: string | null;
  declare created_at: Date;
}

CashbackTransaction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    conversion_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'conversions', key: 'id' },
    },
    type: {
      type: DataTypes.ENUM('earned', 'withdrawal', 'clawback', 'adjustment'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    balance_after: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'cashback_transactions',
    modelName: 'CashbackTransaction',
    timestamps: false,
    underscored: true,
  },
);
