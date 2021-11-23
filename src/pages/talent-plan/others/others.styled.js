import styled from 'styled-components';
import { colors, Styled } from '@tidb-community/ui';

export const Container = styled(Styled.Section)`
  && {
    color: ${colors.M1};
    padding: 0;
  }
`;

export const Content = styled(Styled.Content)`
  position: relative;
  padding-top: 3rem;
  color: ${colors.F1};
`;
