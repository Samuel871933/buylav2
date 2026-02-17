import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../connection';

export interface OutboundClickAttributes {
  id: number;
  visit_id: number | null;
  visitor_id: string;
  ambassador_id: string;
  buyer_user_id: string | null;
  product_id: number | null;
  portal_id: number | null;
  affiliate_program_id: number;
  destination_url: string;
  sub_id_sent: string | null;
  clicked_at: Date;
}

export interface OutboundClickCreationAttributes
  extends Optional<
    OutboundClickAttributes,
    | 'id'
    | 'visit_id'
    | 'buyer_user_id'
    | 'product_id'
    | 'portal_id'
    | 'sub_id_sent'
    | 'clicked_at'
  > {}

export class OutboundClick extends Model<OutboundClickAttributes, OutboundClickCreationAttributes> implements OutboundClickAttributes {
  declare id: number;
  declare visit_id: number | null;
  declare visitor_id: string;
  declare ambassador_id: string;
  declare buyer_user_id: string | null;
  declare product_id: number | null;
  declare portal_id: number | null;
  declare affiliate_program_id: number;
  declare destination_url: string;
  declare sub_id_sent: string | null;
  declare clicked_at: Date;
}

OutboundClick.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    visit_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'visits', key: 'id' },
    },
    visitor_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    ambassador_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    buyer_user_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    portal_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'redirect_portals', key: 'id' },
    },
    affiliate_program_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'affiliate_programs', key: 'id' },
    },
    destination_url: {
      type: DataTypes.STRING(2000),
      allowNull: false,
    },
    sub_id_sent: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    clicked_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'outbound_clicks',
    modelName: 'OutboundClick',
    timestamps: false,
    underscored: true,
  },
);
